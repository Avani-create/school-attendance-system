from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, distinct, func
from sqlalchemy.orm import selectinload
from datetime import datetime
from database import get_db
from models import Student, Teacher, TeacherClass, AuditLog, Class
from auth import get_current_admin, get_current_user
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/classes", tags=["Classes"])

@router.get("")
async def get_classes(
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    """Get all classes with student counts and teacher assignments"""
    
    # ✅ Get all classes from the Class table (only active ones)
    class_stmt = select(Class).where(Class.is_active == True).order_by(Class.name)
    class_result = await db.execute(class_stmt)
    classes = class_result.scalars().all()
    
    # If no classes exist yet, provide default list for school LKG-5th standard
    if not classes:
        defaults = ["LKG", "UKG", "1A", "2A", "3A", "4A", "5A"]
        return {"classes": [
            {
                "class_name": cls,
                "students_count": 0,
                "teachers": []
            } for cls in defaults
        ]}
    
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

    # ✅ FIXED: Get teacher's assigned classes by querying TeacherClass table
    # instead of using current_user.classes (which might not exist)
    teacher_assigned_classes = []
    if not current_user.is_admin:
        teacher_class_query = select(TeacherClass.class_name).where(TeacherClass.teacher_id == current_user.id)
        teacher_class_result = await db.execute(teacher_class_query)
        teacher_assigned_classes = [row[0] for row in teacher_class_result.all()]

    # Build response with all classes from Class table
    result_classes = []
    for class_obj in classes:
        cls_name = class_obj.name
        
        # ✅ FIXED: Check teacher authorization using the queried list
        if not current_user.is_admin:
            if cls_name not in teacher_assigned_classes:
                continue

        result_classes.append({
            "class_name": cls_name,
            "students_count": class_student_counts.get(cls_name, 0),
            "teachers": class_teachers.get(cls_name, [])
        })

    result_classes.sort(key=lambda x: x["class_name"])
    return {"classes": result_classes}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_class(
    payload: Dict[str, str], # {"class_name": "6A"}
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    """Create a new class"""
    class_name = payload.get("class_name")
    if not class_name or len(class_name) > 10:
        raise HTTPException(status_code=400, detail="Invalid class name")
    
    # ✅ Check if class already exists (including soft-deleted)
    stmt = select(Class).where(Class.name == class_name)
    result = await db.execute(stmt)
    existing_class = result.scalar_one_or_none()
    
    if existing_class:
        if existing_class.is_active:
            raise HTTPException(status_code=400, detail="Class already exists")
        else:
            # ✅ Reactivate soft-deleted class
            existing_class.is_active = True
            existing_class.updated_at = datetime.now()
            await db.commit()
            
            # Log the reactivation
            audit_entry = AuditLog(
                user_id=current_admin.id,
                action="REACTIVATE_CLASS",
                table_name="classes",
                record_id=existing_class.id,
                new_data={"class_name": class_name, "status": "reactivated"}
            )
            db.add(audit_entry)
            await db.commit()
            
            return {
                "class_name": class_name, 
                "students_count": 0, 
                "teachers": [],
                "message": "Class reactivated successfully"
            }
    
    # ✅ Create new class in Class table
    new_class = Class(
        name=class_name,
        is_active=True
    )
    db.add(new_class)
    await db.commit()
    await db.refresh(new_class)

    # Log the creation
    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="CREATE_CLASS",
        table_name="classes",
        record_id=new_class.id,
        new_data={"class_name": class_name}
    )
    db.add(audit_entry)
    await db.commit()

    return {
        "class_name": class_name, 
        "students_count": 0, 
        "teachers": [],
        "message": "Class created successfully"
    }


@router.delete("/{class_name}")
async def delete_class(
    class_name: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    """Soft delete a class"""
    
    # ✅ Check if class exists in Class table
    stmt = select(Class).where(Class.name == class_name)
    result = await db.execute(stmt)
    class_obj = result.scalar_one_or_none()
    
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Check if there are active students assigned to this class
    student_stmt = select(Student).where(Student.class_name == class_name, Student.is_active == True)
    student_result = await db.execute(student_stmt)
    students = student_result.scalars().all()
    
    if students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete class because {len(students)} active students are assigned to it"
        )
    
    # ✅ Soft delete the class (mark as inactive)
    class_obj.is_active = False
    class_obj.updated_at = datetime.now()
    await db.commit()

    # ✅ Delete teacher class assignments for this class
    delete_stmt = delete(TeacherClass).where(TeacherClass.class_name == class_name)
    await db.execute(delete_stmt)
    await db.commit()

    # Log the deletion
    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="DELETE_CLASS",
        table_name="classes",
        record_id=class_obj.id,
        old_data={"class_name": class_name, "is_active": True}
    )
    db.add(audit_entry)
    await db.commit()

    return {
        "success": True,
        "message": f"Class {class_name} soft deleted successfully"
    }


@router.get("/available")
async def get_available_classes(
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    """Get all classes that can be assigned to teachers (active classes)"""
    
    stmt = select(Class).where(Class.is_active == True).order_by(Class.name)
    result = await db.execute(stmt)
    classes = result.scalars().all()
    
    return {"classes": [{"id": c.id, "name": c.name} for c in classes]}


@router.get("/{class_name}/students")
async def get_class_students(
    class_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: Teacher = Depends(get_current_user)
):
    """Get all active students in a class"""
    
    # ✅ FIXED: Check teacher authorization using TeacherClass table
    if not current_user.is_admin:
        teacher_class_query = select(TeacherClass).where(
            TeacherClass.teacher_id == current_user.id,
            TeacherClass.class_name == class_name
        )
        teacher_class_result = await db.execute(teacher_class_query)
        assigned = teacher_class_result.scalar_one_or_none()
        
        if not assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this class"
            )
    
    stmt = select(Student).where(
        Student.class_name == class_name,
        Student.is_active == True
    ).order_by(Student.name)
    
    result = await db.execute(stmt)
    students = result.scalars().all()
    
    return {"students": [
        {
            "id": s.id,
            "name": s.name,
            "parent_phone": s.parent_phone,
            "admission_date": s.admission_date
        } for s in students
    ]}