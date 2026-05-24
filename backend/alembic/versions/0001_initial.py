"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-24
"""

import sqlalchemy as sa
import sqlmodel

from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "book",
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("color", sqlmodel.sql.sqltypes.AutoString(length=16), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "resource",
        sa.Column("url", sqlmodel.sql.sqltypes.AutoString(length=2048), nullable=False),
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(length=240), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column("notes", sqlmodel.sql.sqltypes.AutoString(length=4000), nullable=True),
        sa.Column(
            "source_type",
            sa.Enum("article", "paper", "post", "video", "tool", "other", name="sourcetype"),
            nullable=False,
        ),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_resource_url"), "resource", ["url"], unique=True)
    op.create_table(
        "tag",
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tag_name"), "tag", ["name"], unique=True)
    op.create_table(
        "section",
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("book_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["book_id"], ["book.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "resourcetaglink",
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["resource_id"], ["resource.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["tag.id"]),
        sa.PrimaryKeyConstraint("resource_id", "tag_id"),
    )
    op.create_table(
        "resourceplacement",
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("section_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["resource_id"], ["resource.id"]),
        sa.ForeignKeyConstraint(["section_id"], ["section.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("resourceplacement")
    op.drop_table("resourcetaglink")
    op.drop_table("section")
    op.drop_index(op.f("ix_tag_name"), table_name="tag")
    op.drop_table("tag")
    op.drop_index(op.f("ix_resource_url"), table_name="resource")
    op.drop_table("resource")
    op.drop_table("book")
