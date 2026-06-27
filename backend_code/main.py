from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager

from database import get_db, engine, Base, AsyncSessionLocal
from auth import router as auth_router
from routes import students, teachers, classes, attendance, reports, academic_years

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create default admin user and academic year if they don't exist
    async with AsyncSessionLocal() as db:
        from models import Teacher, AcademicYear
        from auth import get_password_hash
        
        # Check if admin exists
        from sqlalchemy import select
        result = await db.execute(select(Teacher).where(Teacher.email == "admin@school.com"))
        admin = result.scalar_one_or_none()
        
        if not admin:
            admin = Teacher(
                name="Principal / Admin",
                email="admin@school.com",
                password_hash=get_password_hash("admin123"),
                phone="0000000000",
                is_admin=True,
                is_active=True
            )
            db.add(admin)
        
        # Check if academic year exists
        result = await db.execute(select(AcademicYear).where(AcademicYear.is_current == True))
        current_year = result.scalar_one_or_none()
        
        if not current_year:
            from datetime import date
            year = AcademicYear(
                name="2026-27",
                start_date=date(2026, 4, 1),
                end_date=date(2027, 3, 31),
                is_current=True
            )
            db.add(year)
        
        await db.commit()
    
    yield
    # Shutdown: nothing needed for SQLite

# Initialize FastAPI with Swagger enabled
app = FastAPI(
    title="School Attendance Management System API",
    description="API for managing school attendance, students, teachers, and reports",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# auth_router needs the /auth prefix since it doesn't have one in auth.py
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(students.router, tags=["Students"])
app.include_router(teachers.router, tags=["Teachers"])
app.include_router(classes.router, tags=["Classes"])
app.include_router(attendance.router, tags=["Attendance"])
app.include_router(reports.router, tags=["Reports"])
app.include_router(academic_years.router, tags=["Academic Years"])

@app.get("/")
async def root():
    return {
        "message": "School Attendance Management System API",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "SQLite"}