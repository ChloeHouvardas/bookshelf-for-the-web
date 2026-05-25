from datetime import datetime

from pydantic import AnyUrl
from sqlmodel import SQLModel

from app.models import SourceType


class TagCreate(SQLModel):
    name: str


class TagRead(TagCreate):
    id: int


class BookCreate(SQLModel):
    title: str
    description: str | None = None
    color: str = "#b76e79"


class BookUpdate(SQLModel):
    title: str | None = None
    description: str | None = None
    color: str | None = None


class BookRead(BookCreate):
    id: int
    created_at: datetime
    updated_at: datetime


class SectionCreate(SQLModel):
    title: str
    position: int = 0


class SectionUpdate(SQLModel):
    title: str | None = None
    position: int | None = None


class SectionRead(SectionCreate):
    id: int
    book_id: int
    created_at: datetime
    updated_at: datetime


class ResourceCreate(SQLModel):
    url: AnyUrl
    title: str
    description: str | None = None
    notes: str | None = None
    source_type: SourceType = SourceType.article
    tag_names: list[str] = []


class ResourceUpdate(SQLModel):
    url: AnyUrl | None = None
    title: str | None = None
    description: str | None = None
    notes: str | None = None
    source_type: SourceType | None = None
    tag_names: list[str] | None = None


class ResourceRead(SQLModel):
    id: int
    url: str
    title: str
    description: str | None
    notes: str | None
    source_type: SourceType
    tags: list[TagRead]
    created_at: datetime
    updated_at: datetime


class ResourcePlacementSummary(SQLModel):
    placement_id: int
    book_id: int
    book_title: str
    section_id: int
    section_title: str


class ResourceWithPlacements(ResourceRead):
    placements: list[ResourcePlacementSummary]


class PlacementCreate(SQLModel):
    resource_id: int
    section_id: int
    position: int = 0


class PlacementRead(SQLModel):
    id: int
    resource: ResourceRead
    section_id: int
    position: int
    created_at: datetime
    updated_at: datetime


class SectionDetail(SectionRead):
    placements: list[PlacementRead]


class BookDetail(BookRead):
    sections: list[SectionDetail]


class BookshelfRead(SQLModel):
    books: list[BookRead]
    resources_count: int
