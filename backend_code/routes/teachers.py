from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from sqlalchemy.orm import selectinload
from database import get_db
from models import Teacher, TeacherClass, AuditLog
from schemas.teachers import TeacherCreate, TeacherUpdate, TeacherResponse, TeacherClassAssignment
from auth import get_current_admin, get_password_hash
from typing import List

router = APIRouter(prefix="/teachers", tags=["Teachers"])

def get_teacher_dict(teacher: Teacher) -> dict:
    # ✅ SAFE: Handle classes that might not be eagerly loaded
    try:
        classes = [c.class_name for c in teacher.classes] if hasattr(teacher, 'classes') and teacher.classes else []
    except:
        classes = []
    
    return {
        "id": teacher.id,
        "name": teacher.name,
        "email": teacher.email,
        "phone": teacher.phone,
        "is_admin": teacher.is_admin,
        "is_active": teacher.is_active,
        "classes": classes,
        "created_at": teacher.created_at.isoformat() if teacher.created_at else None,
        "updated_at": teacher.updated_at.isoformat() if teacher.updated_at else None
    }

@router.get("", response_model=List[TeacherResponse])
async def get_teachers(
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    stmt = select(Teacher).options(selectinload(Teacher.classes)).order_by(Teacher.name)
    result = await db.execute(stmt)
    teachers = result.scalars().all()
    return [get_teacher_dict(teacher) for teacher in teachers]


@router.post("", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    payload: TeacherCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    # Check duplicate email
    stmt = select(Teacher).where(Teacher.email == payload.email)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = get_password_hash(payload.password)
    teacher = Teacher(
        name=payload.name,
        email=payload.email,
        password_hash=hashed_pw,
        phone=payload.phone,
        is_admin=payload.is_admin,
        is_active=True
    )
    db.add(teacher)
    await db.flush()

    # Audit log
    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="CREATE_TEACHER",
        table_name="teachers",
        record_id=teacher.id,
        new_data=get_teacher_dict(teacher)
    )
    db.add(audit_entry)

    await db.commit()
    
    # ✅ Reload with classes eagerly loaded
    stmt_reload = select(Teacher).options(selectinload(Teacher.classes)).where(Teacher.id == teacher.id)
    res_reload = await db.execute(stmt_reload)
    teacher = res_reload.scalar_one()
    return teacher


@router.put("/{teacher_id}", response_model=TeacherResponse)
async def update_teacher(
    teacher_id: int,
    payload: TeacherUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    stmt = select(Teacher).options(selectinload(Teacher.classes)).where(Teacher.id == teacher_id)
    result = await db.execute(stmt)
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    old_data = get_teacher_dict(teacher)
    update_data = payload.model_dump(exclude_unset=True)

    if "name" in update_data:
        teacher.name = update_data["name"]
    if "email" in update_data:
        if update_data["email"] != teacher.email:
            dup_stmt = select(Teacher).where(Teacher.email == update_data["email"])
            dup_res = await db.execute(dup_stmt)
            if dup_res.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Email already in use")
        teacher.email = update_data["email"]
    if "password" in update_data:
        teacher.password_hash = get_password_hash(update_data["password"])
    if "phone" in update_data:
        teacher.phone = update_data["phone"]
    if "is_admin" in update_data:
        teacher.is_admin = update_data["is_admin"]
    if "is_active" in update_data:
        teacher.is_active = update_data["is_active"]

    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="UPDATE_TEACHER",
        table_name="teachers",
        record_id=teacher.id,
        old_data=old_data,
        new_data=get_teacher_dict(teacher)
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(teacher)
    return teacher


@router.delete("/{teacher_id}")
async def soft_delete_teacher(
    teacher_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    if teacher_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    stmt = select(Teacher).options(selectinload(Teacher.classes)).where(Teacher.id == teacher_id)
    result = await db.execute(stmt)
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    old_data = get_teacher_dict(teacher)
    teacher.is_active = False

    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="SOFT_DELETE_TEACHER",
        table_name="teachers",
        record_id=teacher.id,
        old_data=old_data,
        new_data=get_teacher_dict(teacher)
    )
    db.add(audit_entry)

    await db.commit()
    return {"success": True}


@router.post("/{teacher_id}/classes")
async def assign_classes(
    teacher_id: int,
    payload: TeacherClassAssignment,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    stmt = select(Teacher).where(Teacher.id == teacher_id)
    result = await db.execute(stmt)
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    delete_stmt = delete(TeacherClass).where(TeacherClass.teacher_id == teacher_id)
    await db.execute(delete_stmt)

    for class_name in payload.classes:
        assignment = TeacherClass(
            teacher_id=teacher_id,
            class_name=class_name
        )
        db.add(assignment)

    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="ASSIGN_TEACHER_CLASSES",
        table_name="teacher_classes",
        record_id=teacher_id,
        new_data={"classes": payload.classes}
    )
    db.add(audit_entry)

    await db.commit()
    return {"success": True}


@router.delete("/{teacher_id}/classes/{class_name}")
async def remove_class_assignment(
    teacher_id: int,
    class_name: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Teacher = Depends(get_current_admin)
):
    delete_stmt = delete(TeacherClass).where(
        TeacherClass.teacher_id == teacher_id,
        TeacherClass.class_name == class_name
    )
    await db.execute(delete_stmt)

    audit_entry = AuditLog(
        user_id=current_admin.id,
        action="REMOVE_TEACHER_CLASS",
        table_name="teacher_classes",
        record_id=teacher_id,
        new_data={"removed_class": class_name}
    )
    db.add(audit_entry)

    await db.commit()
    return {"success": True}