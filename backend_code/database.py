import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

# Use SQLite (built into Python!)
# The database file will be created as "attendance.db" in your backend_code folder
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./attendance.db")

# Create async engine for SQLite
engine = create_async_engine(
    DATABASE_URL, 
    echo=True,  # Set to False in production (True helps debugging)
    future=True,
    poolclass=NullPool  # SQLite doesn't need connection pooling
)

# Async session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Base class for models
Base = declarative_base()

# Dependency to get db session (for FastAPI routes)
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()