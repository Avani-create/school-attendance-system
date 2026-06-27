from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, distinct, func
from sqlalchemy.orm import selectinload
from database import get_db
from models import Student, Teacher, TeacherClass, AuditLog
from auth import get_current_admin, get_current_user
from typing import List, Dict, Any

router = APIRouter(prefix="/classes", tags=["Classes"])

@router.get("")
async def get_classes(
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    # Fetch all active student class counts
    student_stmt = select(Student.class_name, func.count(Student.id)).where(Student.is_active == True).group_by(Student.class_name)
    student_result = await db.execute(student_stmt)
    class_student_counts = {row[0]: row[1] for row in student_result.all()}

    # Fetch all teacher-class assignments
    teacher_class_stmt = select(TeacherClass).options(selectinload(TeacherClass.teacher))
    teacher_class_result = await db.execute(teacher_class_stmt)
    teacher_classes = teacher_class_result.scalars().all()

    # Group teachers by class
    class_teachers: Dict[str, List[str]] = {}
    for tc in teacher_classes:
        if tc.class_name not in class_teachers:
            class_teachers[tc.class_name] = []
        if tc.teacher.is_active:
            class_teachers[tc.class_name].append(tc.teacher.name)

    # Collect all unique class names from both students and teacher assignments
    all_classes = set(list(class_student_counts.keys()) + list(class_teachers.keys()))
    
    # If no classes exist yet, provide default list for school LKG-5th standard
    if not all_classes:
        defaults = ["LKG", "UKG", "1A", "2A", "3A", "4A", "5A"]
        all_classes.update(defaults)

    result_classes = []
    for cls in all_classes:
        # Check teacher authorization: teachers can only view their own class(es)
        if not current_user.is_admin:
            assigned_classes = [c.class_name for c in current_user.classes]
            if cls not in assigned_classes:
                continue

        result_classes.append({
            "class_name": cls,
            "students_count": class_student_counts.get(cls, 0),
            "teachers": class_teachers.get(cls, [])
        })

    result_classes.sort(key=lambda x: x["class_name"])
    return {"classes": result_classes}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_class(
    payload: Dict[str, str], # {"class_name": "6A"}
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    class_name = payload.get("class_name")
    if not class_name or len(class_name) > 10:
        raise HTTPException(status_code=400, detail="Invalid class name")

    # To create a class without students, we can write an audit log or create a dummy class assignment.
    # We will log the creation. The client can now see it.
    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="CREATE_CLASS",
        table_name="classes",
        record_id=0,
        new_data={"class_name": class_name}
    )
    db.add(audit_entry)
    await db.commit()

    return {"class_name": class_name, "students_count": 0, "teachers": []}


@router.delete("/{class_name}")
async def delete_class(
    class_name: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    # Check if there are active students assigned to this class
    stmt = select(Student).where(Student.class_name == class_name, Student.is_active == True)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()
    if student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete class because active students are assigned to it"
        )

    # Delete teacher class assignments for this class
    delete_stmt = delete(TeacherClass).where(TeacherClass.class_name == class_name)
    await db.execute(delete_stmt)

    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="DELETE_CLASS",
        table_name="classes",
        record_id=0,
        old_data={"class_name": class_name}
    )
    db.add(audit_entry)
    await db.commit()

    return {"success": True}
