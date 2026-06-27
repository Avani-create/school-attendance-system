from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
from models import Student, Teacher, AuditLog
from schemas.students import StudentCreate, StudentUpdate, StudentResponse, StudentPromoteRequest, StudentDeleteRequest
from auth import get_current_admin, get_current_user
from datetime import date
from typing import List, Optional

router = APIRouter(prefix="/students", tags=["Students"])

def get_student_dict(student: Student) -> dict:
    return {
        "id": student.id,
        "name": student.name,
        "class": student.class_name,
        "section": student.section,
        "parent_name": student.parent_name,
        "parent_phone": student.parent_phone,
        "address": student.address,
        "admission_date": str(student.admission_date),
        "leaving_date": str(student.leaving_date) if student.leaving_date else None,
        "leaving_reason": student.leaving_reason,
        "is_active": student.is_active
    }

@router.get("", response_model=List[StudentResponse])
async def get_students(
    class_name: Optional[str] = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    # Fetch students
    query = select(Student)
    
    # Filter by class
    if class_name:
        # Check authorization if teacher
        if not current_user.is_admin:
            assigned_classes = [c.class_name for c in current_user.classes]
            if class_name not in assigned_classes:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to view students in this class"
                )
        query = query.where(Student.class_name == class_name)
    else:
        # If teacher asks for all students, return only their assigned classes
        if not current_user.is_admin:
            assigned_classes = [c.class_name for c in current_user.classes]
            query = query.where(Student.class_name.in_(assigned_classes))

    if active_only:
        query = query.where(Student.is_active == True)

    query = query.order_by(Student.name)
    result = await db.execute(query)
    students = result.scalars().all()
    return students


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    stmt = select(Student).where(Student.id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not current_user.is_admin:
        assigned_classes = [c.class_name for c in current_user.classes]
        if student.class_name not in assigned_classes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this student"
            )

    return student


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    payload: StudentCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    student = Student(
        name=payload.name,
        class_name=payload.class_name,
        section=payload.section,
        parent_name=payload.parent_name,
        parent_phone=payload.parent_phone,
        address=payload.address,
        admission_date=payload.admission_date,
        is_active=True
    )
    db.add(student)
    await db.flush() # Populate generated student ID
    
    # Audit log
    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="CREATE_STUDENT",
        table_name="students",
        record_id=student.id,
        new_data=get_student_dict(student)
    )
    db.add(audit_entry)
    
    await db.commit()
    await db.refresh(student)
    return student


@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    stmt = select(Student).where(Student.id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    old_data = get_student_dict(student)

    # Apply updates
    update_data = payload.model_dump(exclude_unset=True)
    
    if "class_name" in update_data:
        student.class_name = update_data["class_name"]
    if "name" in update_data:
        student.name = update_data["name"]
    if "section" in update_data:
        student.section = update_data["section"]
    if "parent_name" in update_data:
        student.parent_name = update_data["parent_name"]
    if "parent_phone" in update_data:
        student.parent_phone = update_data["parent_phone"]
    if "address" in update_data:
        student.address = update_data["address"]
    if "admission_date" in update_data:
        student.admission_date = update_data["admission_date"]
    if "leaving_date" in update_data:
        student.leaving_date = update_data["leaving_date"]
    if "leaving_reason" in update_data:
        student.leaving_reason = update_data["leaving_reason"]
    if "is_active" in update_data:
        student.is_active = update_data["is_active"]

    # Audit log
    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="UPDATE_STUDENT",
        table_name="students",
        record_id=student.id,
        old_data=old_data,
        new_data=get_student_dict(student)
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(student)
    return student


@router.delete("/{student_id}")
async def soft_delete_student(
    student_id: int,
    payload: StudentDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    stmt = select(Student).where(Student.id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    old_data = get_student_dict(student)

    # Soft delete: update active flag and write leaving reason
    student.is_active = False
    student.leaving_date = date.today()
    student.leaving_reason = payload.reason

    # Audit log
    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="SOFT_DELETE_STUDENT",
        table_name="students",
        record_id=student.id,
        old_data=old_data,
        new_data=get_student_dict(student)
    )
    db.add(audit_entry)

    await db.commit()
    return {"success": True}


@router.post("/promote")
async def promote_students(
    payload: StudentPromoteRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    # Promote all active students from `from_class` to `to_class`
    stmt = select(Student).where(
        Student.class_name == payload.from_class,
        Student.is_active == True
    )
    result = await db.execute(stmt)
    students = result.scalars().all()

    if not students:
        return {"success": True, "promoted_count": 0, "detail": "No active students to promote"}

    promoted_ids = []
    for s in students:
        old_data = get_student_dict(s)
        s.class_name = payload.to_class
        promoted_ids.append(s.id)
        
        # Log promotion
        audit_entry = AuditLog(
            user_id=current_admin.id,
            action="BULK_PROMOTE_STUDENT",
            table_name="students",
            record_id=s.id,
            old_data=old_data,
            new_data=get_student_dict(s)
        )
        db.add(audit_entry)

    await db.commit()
    return {"success": True, "promoted_count": len(students)}
