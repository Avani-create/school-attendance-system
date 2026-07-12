# FORCE POSTGRESQL - NEON DATABASE - DO NOT USE SQLITE
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

# ✅ READ FROM ENVIRONMENT VARIABLE (NOT HARDCODED!)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# ✅ Remove any ?sslmode=require if present (asyncpg doesn't support it)
if "?sslmode=require" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("?sslmode=require", "")

# Create async engine for PostgreSQL with SSL support
engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    future=True,
    connect_args={
        "ssl": True,  # asyncpg uses 'ssl' not 'sslmode'
    },
    pool_pre_ping=True,
    pool_recycle=300,
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