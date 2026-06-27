from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from database import get_db
from models import AcademicYear, Holiday, Teacher, AuditLog
from schemas.academic_years import (
    AcademicYearCreate,
    AcademicYearUpdate,
    AcademicYearResponse,
    HolidayCreate,
    HolidayResponse
)
from auth import get_current_admin, get_current_user
from typing import List, Optional

router = APIRouter(tags=["Academic Years & Holidays"])

@router.get("/academic-years", response_model=List[AcademicYearResponse])
async def get_academic_years(
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    stmt = select(AcademicYear).order_by(AcademicYear.start_date.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/academic-years", response_model=AcademicYearResponse, status_code=status.HTTP_201_CREATED)
async def create_academic_year(
    payload: AcademicYearCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    # Check if duplicate name
    stmt = select(AcademicYear).where(AcademicYear.name == payload.name)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Academic year name already exists")

    # If new year is marked as current, reset others
    if payload.is_current:
        await db.execute(
            update(AcademicYear).values(is_current=False)
        )

    academic_year = AcademicYear(
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_current=payload.is_current
    )
    db.add(academic_year)
    await db.flush()

    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="CREATE_ACADEMIC_YEAR",
        table_name="academic_years",
        record_id=academic_year.id,
        new_data={"name": academic_year.name, "start_date": str(academic_year.start_date), "end_date": str(academic_year.end_date), "is_current": academic_year.is_current}
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(academic_year)
    return academic_year


@router.put("/academic-years/{year_id}", response_model=AcademicYearResponse)
async def update_academic_year(
    year_id: int,
    payload: AcademicYearUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    stmt = select(AcademicYear).where(AcademicYear.id == year_id)
    result = await db.execute(stmt)
    academic_year = result.scalar_one_or_none()

    if not academic_year:
        raise HTTPException(status_code=404, detail="Academic year not found")

    old_data = {"name": academic_year.name, "start_date": str(academic_year.start_date), "end_date": str(academic_year.end_date), "is_current": academic_year.is_current}
    update_data = payload.model_dump(exclude_unset=True)

    if "is_current" in update_data and update_data["is_current"]:
        # Reset all other current flags
        await db.execute(
            update(AcademicYear).values(is_current=False)
        )

    if "name" in update_data:
        academic_year.name = update_data["name"]
    if "start_date" in update_data:
        academic_year.start_date = update_data["start_date"]
    if "end_date" in update_data:
        academic_year.end_date = update_data["end_date"]
    if "is_current" in update_data:
        academic_year.is_current = update_data["is_current"]

    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="UPDATE_ACADEMIC_YEAR",
        table_name="academic_years",
        record_id=academic_year.id,
        old_data=old_data,
        new_data={"name": academic_year.name, "start_date": str(academic_year.start_date), "end_date": str(academic_year.end_date), "is_current": academic_year.is_current}
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(academic_year)
    return academic_year


@router.get("/holidays", response_model=List[HolidayResponse])
async def get_holidays(
    year_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    stmt = select(Holiday)
    if year_id:
        stmt = stmt.where(Holiday.academic_year_id == year_id)
    else:
        # Get holidays for current academic year by default
        curr_stmt = select(AcademicYear).where(AcademicYear.is_current == True)
        curr_res = await db.execute(curr_stmt)
        curr_year = curr_res.scalar_one_or_none()
        if curr_year:
            stmt = stmt.where(Holiday.academic_year_id == curr_year.id)

    stmt = stmt.order_by(Holiday.date)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/holidays", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED)
async def create_holiday(
    payload: HolidayCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    # Verify academic year exists
    stmt_year = select(AcademicYear).where(AcademicYear.id == payload.academic_year_id)
    year_res = await db.execute(stmt_year)
    year = year_res.scalar_one_or_none()
    if not year:
        raise HTTPException(status_code=404, detail="Academic Year not found")

    # Check date matches academic year date bounds
    if not (year.start_date <= payload.date <= year.end_date):
        raise HTTPException(status_code=400, detail=f"Holiday date {payload.date} is outside academic year range ({year.start_date} to {year.end_date})")

    # Check unique constraint (date, academic_year_id)
    stmt = select(Holiday).where(
        Holiday.date == payload.date,
        Holiday.academic_year_id == payload.academic_year_id
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A holiday entry already exists for this date and academic year")

    holiday = Holiday(
        date=payload.date,
        name=payload.name,
        academic_year_id=payload.academic_year_id,
        is_working_saturday=payload.is_working_saturday
    )
    db.add(holiday)
    await db.flush()

    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="CREATE_HOLIDAY",
        table_name="holidays",
        record_id=holiday.id,
        new_data={"date": str(holiday.date), "name": holiday.name, "academic_year_id": holiday.academic_year_id, "is_working_saturday": holiday.is_working_saturday}
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(holiday)
    return holiday


@router.delete("/holidays/{holiday_id}")
async def delete_holiday(
    holiday_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    stmt = select(Holiday).where(Holiday.id == holiday_id)
    result = await db.execute(stmt)
    holiday = result.scalar_one_or_none()

    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")

    old_data = {"date": str(holiday.date), "name": holiday.name, "academic_year_id": holiday.academic_year_id, "is_working_saturday": holiday.is_working_saturday}

    delete_stmt = delete(Holiday).where(Holiday.id == holiday_id)
    await db.execute(delete_stmt)

    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="DELETE_HOLIDAY",
        table_name="holidays",
        record_id=holiday_id,
        old_data=old_data
    )
    db.add(audit_entry)

    await db.commit()
    return {"success": True}
