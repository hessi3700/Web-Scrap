"""Initial listings and price history tables.

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "listings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column("source", sa.String(128), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("address", sa.String(512), nullable=True),
        sa.Column("area", sa.String(256), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("currency", sa.String(8), nullable=True),
        sa.Column("first_seen_at", sa.Date(), nullable=False),
        sa.Column("updated_at", sa.Date(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_id", "source", name="uq_listing_source"),
    )
    op.create_index("ix_listings_source_id", "listings", ["source_id"], unique=False)
    op.create_index("ix_listings_source", "listings", ["source"], unique=False)
    op.create_index("ix_listings_area", "listings", ["area"], unique=False)

    op.create_table(
        "listing_price_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("listing_id", sa.Integer(), nullable=False),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("recorded_at", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id", "recorded_at", name="ix_listing_price_recorded"),
    )
    op.create_index("ix_listing_price_history_listing_id", "listing_price_history", ["listing_id"], unique=False)
    op.create_index("ix_listing_price_history_recorded_at", "listing_price_history", ["recorded_at"], unique=False)


def downgrade() -> None:
    op.drop_table("listing_price_history")
    op.drop_table("listings")
