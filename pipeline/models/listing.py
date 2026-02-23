"""Listing and price history models for ETL storage."""
from datetime import date
from typing import Optional

from sqlalchemy import Date, Float, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.db import Base


class Listing(Base):
    """Normalized listing (one per source_id per source)."""
    __tablename__ = "listings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    area: Mapped[Optional[str]] = mapped_column(String(256), index=True, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    first_seen_at: Mapped[date] = mapped_column(Date, nullable=False)
    updated_at: Mapped[date] = mapped_column(Date, nullable=False)

    price_history: Mapped[list] = relationship("ListingPriceHistory", back_populates="listing", order_by="ListingPriceHistory.recorded_at")

    __table_args__ = (
        UniqueConstraint("source_id", "source", name="uq_listing_source"),
    )


class ListingPriceHistory(Base):
    """Daily (or per-scrape) price snapshot for trend analysis."""
    __tablename__ = "listing_price_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    listing: Mapped["Listing"] = relationship("Listing", back_populates="price_history")

    __table_args__ = (
        Index("ix_listing_price_recorded", "listing_id", "recorded_at", unique=True),
    )
