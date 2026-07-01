# FORCE POSTGRESQL - NEON DATABASE - DO NOT USE SQLITE
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

# ✅ FORCE PostgreSQL – Hardcoded for Neon
# This completely ignores any SQLite fallback
DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_y6IL4kQlOsXw@ep-misty-leaf-aobpkuzu.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# 🔥 FORCE PRINT – This will appear in Render logs if this file is used
print("=" * 60)
print("🚀 USING NEON POSTGRESQL DATABASE!")
print(f"📦 DATABASE_URL: {DATABASE_URL}")
print("=" * 60)

# Create async engine for PostgreSQL
engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    future=True
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