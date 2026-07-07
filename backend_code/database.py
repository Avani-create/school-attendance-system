# FORCE POSTGRESQL - NEON DATABASE - DO NOT USE SQLITE
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

# ✅ FORCE PostgreSQL – Hardcoded for Neon
# REMOVED ?sslmode=require – asyncpg doesn't support it
DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_y6IL4kQlOsXw@ep-misty-leaf-aobpkuzu.c-2.ap-southeast-1.aws.neon.tech/neondb"

# Create async engine for PostgreSQL with SSL support
engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    future=True,
    # ✅ THIS IS CRITICAL FOR NEON POSTGRESQL
    connect_args={
        "ssl": True,  # asyncpg uses 'ssl' not 'sslmode'
        # You can also use: "ssl": "require" for some versions
    },
    pool_pre_ping=True,  # Check connection before using
    pool_recycle=300,    # Recycle connections every 5 minutes
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