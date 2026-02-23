import os
import sys
from pathlib import Path

# Add pipeline root so we can import models and scraper.config
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from alembic import context
from sqlalchemy import create_engine
from models.db import Base
from models.listing import Listing, ListingPriceHistory

config = context.config
target_metadata = Base.metadata
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://webscrap:webscrap@localhost:5432/web_scrap")


def run_migrations_offline():
    context.configure(url=DATABASE_URL, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
