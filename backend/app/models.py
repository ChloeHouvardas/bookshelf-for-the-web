from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, Relationship, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SourceType(str, Enum):
    article = "article"
    paper = "paper"
    post = "post"
    video = "video"
    tool = "tool"
    other = "other"


class ResourceTagLink(SQLModel, table=True):
    resource_id: int | None = Field(default=None, foreign_key="resource.id", primary_key=True)
    tag_id: int | None = Field(default=None, foreign_key="tag.id", primary_key=True)


class BookBase(SQLModel):
    title: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    color: str = Field(default="#b76e79", min_length=4, max_length=16)


class Book(BookBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    sections: list["Section"] = Relationship(back_populates="book")


class SectionBase(SQLModel):
    title: str = Field(min_length=1, max_length=120)
    position: int = Field(default=0, ge=0)


class Section(SectionBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    book_id: int = Field(foreign_key="book.id")
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    book: Book = Relationship(back_populates="sections")
    placements: list["ResourcePlacement"] = Relationship(back_populates="section")


class ResourceBase(SQLModel):
    url: str = Field(min_length=1, max_length=2048, unique=True, index=True)
    title: str = Field(min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=4000)
    source_type: SourceType = SourceType.article


class Resource(ResourceBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    placements: list["ResourcePlacement"] = Relationship(back_populates="resource")
    tags: list["Tag"] = Relationship(back_populates="resources", link_model=ResourceTagLink)


class ResourcePlacementBase(SQLModel):
    position: int = Field(default=0, ge=0)


class ResourcePlacement(ResourcePlacementBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    resource_id: int = Field(foreign_key="resource.id")
    section_id: int = Field(foreign_key="section.id")
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    resource: Resource = Relationship(back_populates="placements")
    section: Section = Relationship(back_populates="placements")


class TagBase(SQLModel):
    name: str = Field(min_length=1, max_length=64, unique=True, index=True)


class Tag(TagBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)

    resources: list[Resource] = Relationship(back_populates="tags", link_model=ResourceTagLink)

