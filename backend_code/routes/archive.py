from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import base64
import uuid

from database import get_db
from models import Teacher, ArchiveRecord, ArchiveImageUpload, ArchiveSearchLog
from auth import get_current_user, get_current_admin

router = APIRouter(prefix="/archive", tags=["Archive"])

# ===== Pydantic Models =====

class ArchiveRecordCreate(BaseModel):
    book_name: Optional[str] = None
    page_number: Optional[int] = None
    year: Optional[int] = None
    student_name: str
    class_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    religion: Optional[str] = None
    caste_category: Optional[str] = None
    parent_name: Optional[str] = None
    admission_date: Optional[str] = None
    leaving_date: Optional[str] = None
    tc_number: Optional[str] = None
    reason_for_leaving: Optional[str] = None
    remarks: Optional[str] = None
    scanned_image_url: Optional[str] = None

class ArchiveRecordUpdate(BaseModel):
    book_name: Optional[str] = None
    page_number: Optional[int] = None
    year: Optional[int] = None
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    religion: Optional[str] = None
    caste_category: Optional[str] = None
    parent_name: Optional[str] = None
    admission_date: Optional[str] = None
    leaving_date: Optional[str] = None
    tc_number: Optional[str] = None
    reason_for_leaving: Optional[str] = None
    remarks: Optional[str] = None

class ArchiveSearchParams(BaseModel):
    query: Optional[str] = None
    year: Optional[int] = None
    class_name: Optional[str] = None
    tc_number: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None

# ===== Helper Functions =====

def generate_unique_id():
    """Generate a unique ID like ARC-001"""
    return f"ARC-{uuid.uuid4().hex[:6].upper()}"

def parse_date(date_str):
    if date_str:
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except:
            return None
    return None

# ===== API Endpoints =====

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_archive_record(
    record: ArchiveRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_admin)
):
    """Create a new archive record"""
    
    # Generate unique ID
    unique_id = generate_unique_id()
    
    new_record = ArchiveRecord(
        unique_id=unique_id,
        book_name=record.book_name,
        page_number=record.page_number,
        year=record.year,
        student_name=record.student_name,
        class_name=record.class_name,
        date_of_birth=parse_date(record.date_of_birth),
        religion=record.religion,
        caste_category=record.caste_category,
        parent_name=record.parent_name,
        admission_date=parse_date(record.admission_date),
        leaving_date=parse_date(record.leaving_date),
        tc_number=record.tc_number,
        reason_for_leaving=record.reason_for_leaving,
        remarks=record.remarks,
        scanned_image_url=record.scanned_image_url,
        uploaded_by=current_user.email
    )
    
    db.add(new_record)
    await db.commit()
    await db.refresh(new_record)
    
    return {
        "message": "Archive record created successfully",
        "record": {
            "id": new_record.id,
            "unique_id": new_record.unique_id,
            "student_name": new_record.student_name,
            "year": new_record.year,
            "tc_number": new_record.tc_number
        }
    }

@router.get("")
async def search_archive_records(
    query: Optional[str] = None,
    year: Optional[int] = None,
    class_name: Optional[str] = None,
    tc_number: Optional[str] = None,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    """Search archive records by name, year, class, or TC number"""
    
    stmt = select(ArchiveRecord).where(ArchiveRecord.is_archived == False)
    
    # Apply filters
    if query:
        stmt = stmt.where(
            or_(
                ArchiveRecord.student_name.ilike(f"%{query}%"),
                ArchiveRecord.unique_id.ilike(f"%{query}%"),
                ArchiveRecord.parent_name.ilike(f"%{query}%"),
                ArchiveRecord.tc_number.ilike(f"%{query}%")
            )
        )
    
    if year:
        stmt = stmt.where(ArchiveRecord.year == year)
    
    if start_year and end_year:
        stmt = stmt.where(and_(ArchiveRecord.year >= start_year, ArchiveRecord.year <= end_year))
    elif start_year:
        stmt = stmt.where(ArchiveRecord.year >= start_year)
    elif end_year:
        stmt = stmt.where(ArchiveRecord.year <= end_year)
    
    if class_name:
        stmt = stmt.where(ArchiveRecord.class_name == class_name)
    
    if tc_number:
        stmt = stmt.where(ArchiveRecord.tc_number.ilike(f"%{tc_number}%"))
    
    # Order by year descending (newest first)
    stmt = stmt.order_by(ArchiveRecord.year.desc(), ArchiveRecord.student_name)
    
    # Pagination
    stmt = stmt.limit(limit).offset(offset)
    
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    # Log search for analytics
    if query or year or tc_number:
        search_log = ArchiveSearchLog(
            search_term=query or f"year:{year}" or f"tc:{tc_number}",
            results_count=len(records),
            ip_address=""
        )
        db.add(search_log)
        await db.commit()
    
    return {
        "records": [
            {
                "id": r.id,
                "unique_id": r.unique_id,
                "student_name": r.student_name,
                "class": r.class_name,
                "year": r.year,
                "tc_number": r.tc_number,
                "parent_name": r.parent_name,
                "leaving_date": r.leaving_date,
                "scanned_image_url": r.scanned_image_url,
                "created_at": r.created_at
            }
            for r in records
        ],
        "count": len(records)
    }

@router.get("/{record_id}")
async def get_archive_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    """Get a single archive record by ID"""
    stmt = select(ArchiveRecord).where(ArchiveRecord.id == record_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    return {
        "record": {
            "id": record.id,
            "unique_id": record.unique_id,
            "book_name": record.book_name,
            "page_number": record.page_number,
            "year": record.year,
            "student_name": record.student_name,
            "class": record.class_name,
            "date_of_birth": record.date_of_birth,
            "religion": record.religion,
            "caste_category": record.caste_category,
            "parent_name": record.parent_name,
            "admission_date": record.admission_date,
            "leaving_date": record.leaving_date,
            "tc_number": record.tc_number,
            "reason_for_leaving": record.reason_for_leaving,
            "remarks": record.remarks,
            "scanned_image_url": record.scanned_image_url,
            "uploaded_by": record.uploaded_by,
            "created_at": record.created_at
        }
    }

@router.put("/{record_id}")
async def update_archive_record(
    record_id: int,
    record_data: ArchiveRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_admin)
):
    """Update an archive record"""
    stmt = select(ArchiveRecord).where(ArchiveRecord.id == record_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Update fields
    for key, value in record_data.dict(exclude_unset=True).items():
        if key in ["date_of_birth", "admission_date", "leaving_date"] and value:
            try:
                setattr(record, key, datetime.strptime(value, "%Y-%m-%d").date())
            except:
                pass
        else:
            setattr(record, key, value)
    
    record.updated_at = datetime.now()
    await db.commit()
    await db.refresh(record)
    
    return {"message": "Record updated successfully"}

@router.delete("/{record_id}")
async def delete_archive_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_admin)
):
    """Soft delete (archive) a record"""
    stmt = select(ArchiveRecord).where(ArchiveRecord.id == record_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    record.is_archived = True
    await db.commit()
    
    return {"message": "Record archived successfully"}

@router.get("/years/list")
async def get_archive_years(
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    """Get list of all years with record counts"""
    stmt = select(
        ArchiveRecord.year,
        func.count(ArchiveRecord.id).label("count")
    ).where(ArchiveRecord.is_archived == False)
    stmt = stmt.group_by(ArchiveRecord.year).order_by(ArchiveRecord.year.desc())
    
    result = await db.execute(stmt)
    years = result.all()
    
    return {
        "years": [
            {"year": y[0], "count": y[1]}
            for y in years if y[0] is not None
        ]
    }

@router.post("/upload-image/{record_id}")
async def upload_archive_image(
    record_id: int,
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_admin)
):
    """Upload a scanned image for an archive record"""
    # Check if record exists
    stmt = select(ArchiveRecord).where(ArchiveRecord.id == record_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Read image and convert to base64 (or upload to cloud)
    contents = await image.read()
    image_base64 = base64.b64encode(contents).decode('utf-8')
    image_url = f"data:image/{image.content_type.split('/')[-1]};base64,{image_base64}"
    
    # Store in image uploads table
    image_record = ArchiveImageUpload(
        record_id=record_id,
        image_url=image_url,
        image_type="front"
    )
    db.add(image_record)
    
    # Update the main record with image URL
    record.scanned_image_url = image_url
    await db.commit()
    
    return {
        "message": "Image uploaded successfully",
        "image_url": image_url
    }