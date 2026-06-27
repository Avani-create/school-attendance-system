from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from io import BytesIO
from database import get_db
from models import Student, Attendance, Teacher
from auth import get_current_user
from utils.working_days import get_working_dates
from utils.pdf_generator import generate_student_pdf, generate_class_pdf, generate_class_tc_pdf
from datetime import date
from typing import List, Dict, Any

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/student/{student_id}")
async def get_student_report_pdf(
    student_id: int,
    from_date: date,
    to_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    # Fetch student
    stmt = select(Student).where(Student.id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Authorize: teachers can only view their own class students
    if not current_user.is_admin:
        assigned_classes = [c.class_name for c in current_user.classes]
        if student.class_name not in assigned_classes:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    # Effective working day range based on joins/leaves
    start_date_eff = max(from_date, student.admission_date)
    end_date_eff = to_date
    if student.leaving_date:
        end_date_eff = min(to_date, student.leaving_date)

    if start_date_eff > end_date_eff:
        # Empty PDF / Not Enrolled
        pdf_data = generate_student_pdf(
            student_name=student.name,
            class_name=student.class_name,
            section=student.section,
            parent_name=student.parent_name,
            parent_phone=student.parent_phone,
            academic_year=f"{from_date.year}-{str(to_date.year)[2:]}",
            working_days=0,
            present_days=0,
            absent_days=0,
            attendance_pct=0.0,
            records=[]
        )
    else:
        # Fetch working dates list in range
        working_dates = await get_working_dates(db, start_date_eff, end_date_eff)
        working_dates_set = set(working_dates)
        total_working_days = len(working_dates)

        # Fetch attendance logs
        stmt_att = select(Attendance).where(
            Attendance.student_id == student_id,
            Attendance.date.between(start_date_eff, end_date_eff)
        ).order_by(Attendance.date)
        result_att = await db.execute(stmt_att)
        attendance_records = result_att.scalars().all()

        # Map attendance by date
        attendance_map = {r.date: (r.status, r.reason) for r in attendance_records if r.date in working_dates_set}

        present_days = 0
        absent_days = 0
        records_list = []

        # Iterate all working dates to build details list
        for d in working_dates:
            status_val, reason_val = attendance_map.get(d, ("present", None))
            if status_val == "absent":
                absent_days += 1
            else:
                present_days += 1
            
            records_list.append({
                "date": d,
                "status": status_val,
                "reason": reason_val
            })

        attendance_pct = round((present_days / total_working_days * 100), 1) if total_working_days > 0 else 0.0
        academic_year_name = f"{from_date.year}-{str(to_date.year)[2:]}"

        pdf_data = generate_student_pdf(
            student_name=student.name,
            class_name=student.class_name,
            section=student.section,
            parent_name=student.parent_name,
            parent_phone=student.parent_phone,
            academic_year=academic_year_name,
            working_days=total_working_days,
            present_days=present_days,
            absent_days=absent_days,
            attendance_pct=attendance_pct,
            records=records_list
        )

    # Return stream response
    filename = f"attendance_report_{student.name.lower().replace(' ', '_')}.pdf"
    return StreamingResponse(
        BytesIO(pdf_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/class/{class_name}")
async def get_class_report_pdf(
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
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    # Fetch active students in class during this range
    stmt = select(Student).where(
        Student.class_name == class_name,
        Student.admission_date <= to_date,
        (Student.is_active == True) | (Student.leaving_date >= from_date)
    ).order_by(Student.name)
    result = await db.execute(stmt)
    students = result.scalars().all()

    # Get class overall working days count (using max range)
    # The report displays the class overall working days, but calculations per student will bound individually
    total_class_working_days = len(await get_working_dates(db, from_date, to_date))

    students_summary = []
    for s in students:
        start_date_eff = max(from_date, s.admission_date)
        end_date_eff = to_date
        if s.leaving_date:
            end_date_eff = min(to_date, s.leaving_date)

        if start_date_eff > end_date_eff:
            students_summary.append({
                "name": s.name,
                "present": 0,
                "absent": 0,
                "percentage": 0.0
            })
            continue

        working_dates = await get_working_dates(db, start_date_eff, end_date_eff)
        working_dates_set = set(working_dates)
        total_student_working_days = len(working_dates)

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

        percentage = round((present_days / total_student_working_days * 100), 1) if total_student_working_days > 0 else 0.0

        students_summary.append({
            "name": s.name,
            "present": present_days,
            "absent": absent_days,
            "percentage": percentage
        })

    academic_year_name = f"{from_date.year}-{str(to_date.year)[2:]}"
    pdf_data = generate_class_pdf(
        class_name=class_name,
        academic_year=academic_year_name,
        working_days=total_class_working_days,
        students_summary=students_summary
    )

    filename = f"class_{class_name}_attendance_report.pdf"
    return StreamingResponse(
        BytesIO(pdf_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/class/{class_name}/tc")
async def get_class_tc_report_pdf(
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
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    # Fetch active students in class during this range
    stmt = select(Student).where(
        Student.class_name == class_name,
        Student.admission_date <= to_date,
        (Student.is_active == True) | (Student.leaving_date >= from_date)
    ).order_by(Student.name)
    result = await db.execute(stmt)
    students = result.scalars().all()

    students_summary = []
    for s in students:
        start_date_eff = max(from_date, s.admission_date)
        end_date_eff = to_date
        if s.leaving_date:
            end_date_eff = min(to_date, s.leaving_date)

        if start_date_eff > end_date_eff:
            students_summary.append({
                "name": s.name,
                "working_days": 0,
                "present": 0,
                "absent": 0,
                "percentage": 0.0
            })
            continue

        working_dates = await get_working_dates(db, start_date_eff, end_date_eff)
        working_dates_set = set(working_dates)
        total_student_working_days = len(working_dates)

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

        percentage = round((present_days / total_student_working_days * 100), 1) if total_student_working_days > 0 else 0.0

        students_summary.append({
            "name": s.name,
            "working_days": total_student_working_days,
            "present": present_days,
            "absent": absent_days,
            "percentage": percentage
        })

    academic_year_name = f"{from_date.year}-{str(to_date.year)[2:]}"
    pdf_data = generate_class_tc_pdf(
        class_name=class_name,
        academic_year=academic_year_name,
        students_summary=students_summary
    )

    filename = f"class_{class_name}_tc_report.pdf"
    return StreamingResponse(
        BytesIO(pdf_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
