from collections.abc import AsyncIterator, Sequence
from contextlib import asynccontextmanager
from typing import Any, cast

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.sql.elements import ColumnElement
from sqlmodel import Session, func, select

from app.config import get_settings
from app.database import get_session, init_db
from app.models import Book, Resource, ResourcePlacement, Section, Tag, utc_now
from app.schemas import (
    BookCreate,
    BookDetail,
    BookRead,
    BookshelfRead,
    BookUpdate,
    PlacementCreate,
    PlacementRead,
    ResourceCreate,
    ResourcePlacementSummary,
    ResourceRead,
    ResourceUpdate,
    ResourceWithPlacements,
    SectionCreate,
    SectionRead,
    SectionUpdate,
    TagRead,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(title="Online Bookshelf API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def column(value: Any) -> ColumnElement[Any]:
    return cast(ColumnElement[Any], value)


def normalize_name(value: str) -> str:
    return " ".join(value.strip().lower().split())


def serialize_resource(resource: Resource) -> ResourceRead:
    return ResourceRead(
        id=resource.id or 0,
        url=resource.url,
        title=resource.title,
        description=resource.description,
        notes=resource.notes,
        source_type=resource.source_type,
        tags=[
            TagRead(id=tag.id or 0, name=tag.name)
            for tag in sorted(resource.tags, key=lambda t: t.name)
        ],
        created_at=resource.created_at,
        updated_at=resource.updated_at,
    )


def get_or_create_tags(session: Session, names: Sequence[str]) -> list[Tag]:
    tags: list[Tag] = []
    for raw_name in names:
        name = raw_name.strip().lower()
        if not name:
            continue
        tag = session.exec(select(Tag).where(Tag.name == name)).first()
        if tag is None:
            tag = Tag(name=name)
            session.add(tag)
            session.flush()
        tags.append(tag)
    return tags


@app.get("/bookshelf", response_model=BookshelfRead)
def read_bookshelf(session: Session = Depends(get_session)) -> BookshelfRead:
    books = session.exec(select(Book).order_by(column(Book.created_at))).all()
    resources_count = session.exec(select(func.count(column(Resource.id)))).one()
    return BookshelfRead(books=list(books), resources_count=resources_count)


@app.post("/books", response_model=BookRead, status_code=status.HTTP_201_CREATED)
def create_book(payload: BookCreate, session: Session = Depends(get_session)) -> Book:
    normalized_title = normalize_name(payload.title)
    existing_books = session.exec(select(Book)).all()
    if any(normalize_name(book.title) == normalized_title for book in existing_books):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A book with this title already exists",
        )
    book = Book.model_validate(payload)
    session.add(book)
    session.commit()
    session.refresh(book)
    return book


@app.get("/books", response_model=list[BookRead])
def list_books(session: Session = Depends(get_session)) -> list[Book]:
    return list(session.exec(select(Book).order_by(column(Book.created_at))).all())


@app.get("/books/{book_id}", response_model=BookDetail)
def get_book(book_id: int, session: Session = Depends(get_session)) -> BookDetail:
    book = session.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    sections = session.exec(
        select(Section)
        .where(Section.book_id == book_id)
        .order_by(column(Section.position), column(Section.created_at))
    ).all()
    section_details = []
    for section in sections:
        placements = session.exec(
            select(ResourcePlacement)
            .where(ResourcePlacement.section_id == section.id)
            .order_by(column(ResourcePlacement.position), column(ResourcePlacement.created_at))
        ).all()
        section_details.append(
            {
                **SectionRead.model_validate(section).model_dump(),
                "placements": [
                    PlacementRead(
                        id=placement.id or 0,
                        resource=serialize_resource(placement.resource),
                        section_id=placement.section_id,
                        position=placement.position,
                        created_at=placement.created_at,
                        updated_at=placement.updated_at,
                    )
                    for placement in placements
                ],
            }
        )
    return BookDetail(**BookRead.model_validate(book).model_dump(), sections=section_details)


@app.patch("/books/{book_id}", response_model=BookRead)
def update_book(book_id: int, payload: BookUpdate, session: Session = Depends(get_session)) -> Book:
    book = session.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(book, field, value)
    book.updated_at = utc_now()
    session.add(book)
    session.commit()
    session.refresh(book)
    return book


@app.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, session: Session = Depends(get_session)) -> None:
    book = session.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    session.delete(book)
    session.commit()


@app.post(
    "/books/{book_id}/sections",
    response_model=SectionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_section(
    book_id: int, payload: SectionCreate, session: Session = Depends(get_session)
) -> Section:
    if session.get(Book, book_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    section = Section(**payload.model_dump(), book_id=book_id)
    session.add(section)
    session.commit()
    session.refresh(section)
    return section


@app.patch("/sections/{section_id}", response_model=SectionRead)
def update_section(
    section_id: int, payload: SectionUpdate, session: Session = Depends(get_session)
) -> Section:
    section = session.get(Section, section_id)
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(section, field, value)
    section.updated_at = utc_now()
    session.add(section)
    session.commit()
    session.refresh(section)
    return section


@app.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(section_id: int, session: Session = Depends(get_session)) -> None:
    section = session.get(Section, section_id)
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    session.delete(section)
    session.commit()


@app.post("/resources", response_model=ResourceRead, status_code=status.HTTP_201_CREATED)
def create_resource(
    payload: ResourceCreate, session: Session = Depends(get_session)
) -> ResourceRead:
    existing = session.exec(select(Resource).where(Resource.url == str(payload.url))).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resource URL already exists",
        )
    data = payload.model_dump(exclude={"tag_names"})
    data["url"] = str(payload.url)
    resource = Resource(**data)
    resource.tags = get_or_create_tags(session, payload.tag_names)
    session.add(resource)
    session.commit()
    session.refresh(resource)
    return serialize_resource(resource)


@app.get("/resources", response_model=list[ResourceRead])
def list_resources(session: Session = Depends(get_session)) -> list[ResourceRead]:
    resources = session.exec(select(Resource).order_by(column(Resource.created_at))).all()
    return [serialize_resource(resource) for resource in resources]


@app.get("/resources/with-placements", response_model=list[ResourceWithPlacements])
def list_resources_with_placements(
    session: Session = Depends(get_session),
) -> list[ResourceWithPlacements]:
    resources = session.exec(select(Resource).order_by(column(Resource.created_at))).all()
    response: list[ResourceWithPlacements] = []
    for resource in resources:
        placements = session.exec(
            select(ResourcePlacement)
            .where(ResourcePlacement.resource_id == resource.id)
            .order_by(column(ResourcePlacement.created_at))
        ).all()
        resource_data = serialize_resource(resource).model_dump()
        response.append(
            ResourceWithPlacements(
                **resource_data,
                placements=[
                    ResourcePlacementSummary(
                        placement_id=placement.id or 0,
                        book_id=placement.section.book_id,
                        book_title=placement.section.book.title,
                        section_id=placement.section_id,
                        section_title=placement.section.title,
                    )
                    for placement in placements
                ],
            )
        )
    return response


@app.patch("/resources/{resource_id}", response_model=ResourceRead)
def update_resource(
    resource_id: int, payload: ResourceUpdate, session: Session = Depends(get_session)
) -> ResourceRead:
    resource = session.get(Resource, resource_id)
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    data = payload.model_dump(exclude_unset=True, exclude={"tag_names"})
    if "url" in data:
        data["url"] = str(data["url"])
    for field, value in data.items():
        setattr(resource, field, value)
    if payload.tag_names is not None:
        resource.tags = get_or_create_tags(session, payload.tag_names)
    resource.updated_at = utc_now()
    session.add(resource)
    session.commit()
    session.refresh(resource)
    return serialize_resource(resource)


@app.post("/placements", response_model=PlacementRead, status_code=status.HTTP_201_CREATED)
def create_placement(
    payload: PlacementCreate, session: Session = Depends(get_session)
) -> PlacementRead:
    resource = session.get(Resource, payload.resource_id)
    section = session.get(Section, payload.section_id)
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    placement = ResourcePlacement.model_validate(payload)
    session.add(placement)
    session.commit()
    session.refresh(placement)
    return PlacementRead(
        id=placement.id or 0,
        resource=serialize_resource(resource),
        section_id=placement.section_id,
        position=placement.position,
        created_at=placement.created_at,
        updated_at=placement.updated_at,
    )


@app.delete("/placements/{placement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_placement(placement_id: int, session: Session = Depends(get_session)) -> None:
    placement = session.get(ResourcePlacement, placement_id)
    if placement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Placement not found")
    session.delete(placement)
    session.commit()
