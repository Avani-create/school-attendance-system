from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, and_, func
from database import get_db
from models import Student, Attendance, Teacher, TeacherClass, AcademicYear, Holiday
from schemas.attendance import (
    AttendanceBulkCreate,
    StudentSummary,
    MonthlyBreakdownItem,
    StudentAttendanceReportResponse,
    ClassStudentAttendanceItem,
    ClassAttendanceReportResponse,
    TodayAttendanceStatsResponse,
    ClassWiseTodayStats
)
from auth import get_current_user, get_current_admin
from utils.working_days import get_working_dates, get_working_days_count
from datetime import date, datetime
from typing import List, Dict

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post("/bulk", status_code=status.HTTP_200_OK)
async def mark_bulk_attendance(
    payload: AttendanceBulkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    # Verify authorization: Teachers can only mark attendance for their assigned classes unless they are admin
    if not current_user.is_admin:
        assigned_classes = [c.class_name for c in current_user.classes]
        if payload.class_name not in assigned_classes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this class"
            )

    # Check if the date is a weekend/holiday and NOT a working Saturday
    # To prevent accidental saves on non-working days
    stmt = select(Holiday).where(Holiday.date == payload.date)
    result = await db.execute(stmt)
    holiday = result.scalar_one_or_none()

    is_sat = payload.date.weekday() == 5
    is_sun = payload.date.weekday() == 6

    if is_sun:
        raise HTTPException(status_code=400, detail="Cannot save attendance on a Sunday")
    if is_sat and (not holiday or not holiday.is_working_saturday):
        raise HTTPException(status_code=400, detail="Cannot save attendance on a non-working Saturday")
    if holiday and not holiday.is_working_saturday:
        raise HTTPException(status_code=400, detail=f"Cannot save attendance on a holiday: {holiday.name}")

    # Fetch active students in class as of this date
    # (Student must be admitted on or before date, and either active or left after date)
    stmt = select(Student).where(
        Student.class_name == payload.class_name,
        Student.admission_date <= payload.date,
        (Student.is_active == True) | (Student.leaving_date >= payload.date)
    )
    result = await db.execute(stmt)
    students = result.scalars().all()

    if not students:
        raise HTTPException(status_code=400, detail="No active students found in this class for the selected date")

    student_ids = [s.id for s in students]

    # Delete existing attendance for these students on this date to prevent duplicate key errors
    delete_stmt = delete(Attendance).where(
        Attendance.student_id.in_(student_ids),
        Attendance.date == payload.date
    )
    await db.execute(delete_stmt)

    # Insert new records
    saved_count = 0
    for s in students:
        is_absent = s.id in payload.absent_student_ids
        status_val = "absent" if is_absent else "present"
        reason_val = payload.reasons.get(str(s.id)) or payload.reasons.get(s.id) if is_absent else None

        attendance_record = Attendance(
            student_id=s.id,
            date=payload.date,
            status=status_val,
            reason=reason_val,
            teacher_id=current_user.id
        )
        db.add(attendance_record)
        saved_count += 1

    await db.commit()
    return {"success": True, "saved_count": saved_count}


@router.get("/student/{student_id}", response_model=StudentAttendanceReportResponse)
async def get_student_attendance(
    student_id: int,
    from_date: date,
    to_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    # Fetch Student
    stmt = select(Student).where(Student.id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Authorize: Teachers can only view students in their assigned classes unless admin
    if not current_user.is_admin:
        assigned_classes = [c.class_name for c in current_user.classes]
        if student.class_name not in assigned_classes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this student's attendance"
            )

    # Effective working day date range based on join and leave dates
    start_date_eff = max(from_date, student.admission_date)
    end_date_eff = to_date
    if student.leaving_date:
        end_date_eff = min(to_date, student.leaving_date)

    if start_date_eff > end_date_eff:
        # Student was not enrolled during this period
        return {
            "student": {
                "id": student.id,
                "name": student.name,
                "class": student.class_name,
                "section": student.section,
                "parent_name": student.parent_name,
                "parent_phone": student.parent_phone,
                "admission_date": student.admission_date,
                "leaving_date": student.leaving_date,
                "leaving_reason": student.leaving_reason,
                "is_active": student.is_active
            },
            "summary": {
                "total_days": 0,
                "present": 0,
                "absent": 0,
                "percentage": 0.0,
                "monthly_breakdown": []
            }
        }

    # Fetch working dates list in range
    working_dates = await get_working_dates(db, start_date_eff, end_date_eff)
    working_dates_set = set(working_dates)
    total_working_days = len(working_dates)

    # Fetch attendance logs in effective range
    stmt = select(Attendance).where(
        Attendance.student_id == student_id,
        Attendance.date.between(start_date_eff, end_date_eff)
    )
    result = await db.execute(stmt)
    attendance_records = result.scalars().all()

    # Map attendance by date (filter only to days that were working days)
    attendance_map = {}
    for record in attendance_records:
        if record.date in working_dates_set:
            attendance_map[record.date] = record.status

    # Count Present & Absent
    present_days = 0
    absent_days = 0

    for d in working_dates:
        status_val = attendance_map.get(d, "present") # Default to present if not marked
        if status_val == "absent":
            absent_days += 1
        else:
            present_days += 1

    percentage = round((present_days / total_working_days * 100), 1) if total_working_days > 0 else 0.0

    # Monthly breakdown
    monthly_data: Dict[str, Dict[str, int]] = {}
    for d in working_dates:
        month_str = d.strftime("%B %Y")
        if month_str not in monthly_data:
            monthly_data[month_str] = {"present": 0, "absent": 0}

        status_val = attendance_map.get(d, "present")
        if status_val == "absent":
            monthly_data[month_str]["absent"] += 1
        else:
            monthly_data[month_str]["present"] += 1

    monthly_breakdown = [
        MonthlyBreakdownItem(month=k, present=v["present"], absent=v["absent"])
        for k, v in monthly_data.items()
    ]

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "class": student.class_name,
            "section": student.section,
            "parent_name": student.parent_name,
            "parent_phone": student.parent_phone,
            "admission_date": student.admission_date,
            "leaving_date": student.leaving_date,
            "leaving_reason": student.leaving_reason,
            "is_active": student.is_active
        },
        "summary": {
            "total_days": total_working_days,
            "present": present_days,
            "absent": absent_days,
            "percentage": percentage,
            "monthly_breakdown": monthly_breakdown
        }
    }


@router.get("/class/{class_name}", response_model=ClassAttendanceReportResponse)
async def get_class_attendance(
    class_name: str,
    from_date: date,
    to_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    # Verify access
    if not current_user.is_admin:
        assigned_classes = [c.class_name for c in current_user.classes]
        if class_name not in assigned_classes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view reports for this class"
            )

    # Fetch active students in class during this range
    stmt = select(Student).where(
        Student.class_name == class_name,
        Student.admission_date <= to_date,
        (Student.is_active == True) | (Student.leaving_date >= from_date)
    )
    result = await db.execute(stmt)
    students = result.scalars().all()

    student_items = []
    for s in students:
        # Effective working days for this student
        start_date_eff = max(from_date, s.admission_date)
        end_date_eff = to_date
        if s.leaving_date:
            end_date_eff = min(to_date, s.leaving_date)

        if start_date_eff > end_date_eff:
            # Student was not enrolled during this period
            student_items.append(
                ClassStudentAttendanceItem(
                    id=s.id,
                    name=s.name,
                    present=0,
                    absent=0,
                    percentage=0.0
                )
            )
            continue

        working_dates = await get_working_dates(db, start_date_eff, end_date_eff)
        working_dates_set = set(working_dates)
        total_working_days = len(working_dates)

        # Get attendance records
        stmt_att = select(Attendance).where(
            Attendance.student_id == s.id,
            Attendance.date.between(start_date_eff, end_date_eff)
        )
        result_att = await db.execute(stmt_att)
        records = result_att.scalars().all()

        attendance_map = {r.date: r.status for r in records if r.date in working_dates_set}

        present_days = 0
        absent_days = 0

        for d in working_dates:
            status_val = attendance_map.get(d, "present")
            if status_val == "absent":
                absent_days += 1
            else:
                present_days += 1

        percentage = round((present_days / total_working_days * 100), 1) if total_working_days > 0 else 0.0

        student_items.append(
            ClassStudentAttendanceItem(
                id=s.id,
                name=s.name,
                present=present_days,
                absent=absent_days,
                percentage=percentage
            )
        )

    # Sort students by name
    student_items.sort(key=lambda x: x.name)

    return {
        "class_name": class_name,
        "students": student_items
    }


@router.get("/today", response_model=TodayAttendanceStatsResponse)
async def get_today_attendance(
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    today = date.today()

    # If it is Sunday, or a holiday, today's attendance can be empty or refer to the last working day.
    # But let's return for "today".
    # Fetch all active students as of today
    stmt = select(Student).where(Student.is_active == True)
    result = await db.execute(stmt)
    students = result.scalars().all()

    total_students = len(students)

    # Fetch today's attendance records
    stmt_att = select(Attendance).where(Attendance.date == today)
    result_att = await db.execute(stmt_att)
    records = result_att.scalars().all()
    absent_ids = {r.student_id for r in records if r.status == "absent"}

    present_count = 0
    absent_count = 0

    # Group by class
    class_groups: Dict[str, List[Student]] = {}
    for s in students:
        if s.class_name not in class_groups:
            class_groups[s.class_name] = []
        class_groups[s.class_name].append(s)

        if s.id in absent_ids:
            absent_count += 1
        else:
            present_count += 1

    overall_pct = round((present_count / total_students * 100), 1) if total_students > 0 else 0.0

    class_wise = []
    for class_name, class_students in class_groups.items():
        # Check if current user is admin, or is assigned to this class
        if not current_user.is_admin:
            assigned_classes = [c.class_name for c in current_user.classes]
            if class_name not in assigned_classes:
                continue

        c_total = len(class_students)
        c_absent = sum(1 for s in class_students if s.id in absent_ids)
        c_present = c_total - c_absent
        c_pct = round((c_present / c_total * 100), 1) if c_total > 0 else 0.0

        class_wise.append(
            ClassWiseTodayStats(
                class_name=class_name,
                present=c_present,
                total=c_total,
                percentage=c_pct
            )
        )

    class_wise.sort(key=lambda x: x.class_name)

    return {
        "date": today,
        "total_students": total_students,
        "present_count": present_count,
        "absent_count": absent_count,
        "percentage": overall_pct,
        "class_wise": class_wise
    }
