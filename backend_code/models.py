from sqlalchemy import Column, Integer, String, Boolean, Date, Text, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import relationship
from database import Base

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(10), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # ❌ REMOVED ALL RELATIONSHIPS - they were causing errors!
    # students = relationship("Student", back_populates="class_info")
    # teacher_classes = relationship("TeacherClass", back_populates="class_ref")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    class_name = Column("class", String(10), nullable=False)
    section = Column(String(5))
    parent_name = Column(String(100))
    parent_phone = Column(String(15))
    address = Column(Text)
    admission_date = Column(Date, nullable=False, server_default=func.current_date())
    leaving_date = Column(Date, nullable=True)
    leaving_reason = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Relationships
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    academic_history = relationship("StudentAcademicYear", back_populates="student", cascade="all, delete-orphan")
    # ❌ REMOVED class_info relationship

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(15))
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Relationships
    classes = relationship("TeacherClass", back_populates="teacher", cascade="all, delete-orphan")
    attendance_taken = relationship("Attendance", back_populates="teacher")
    audit_logs = relationship("AuditLog", back_populates="user")


class TeacherClass(Base):
    __tablename__ = "teacher_classes"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    class_name = Column("class", String(10), nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp())

    # Relationships
    teacher = relationship("Teacher", back_populates="classes")
    # ❌ REMOVED class_ref relationship - was causing error!


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), unique=True, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.current_timestamp())

    # Relationships
    holidays = relationship("Holiday", back_populates="academic_year", cascade="all, delete-orphan")
    student_records = relationship("StudentAcademicYear", back_populates="academic_year", cascade="all, delete-orphan")


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    name = Column(String(100), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    is_working_saturday = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.current_timestamp())

    # Relationships
    academic_year = relationship("AcademicYear", back_populates="holidays")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(10), nullable=False)
    reason = Column(Text, nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())

    # Relationships
    student = relationship("Student", back_populates="attendance_records")
    teacher = relationship("Teacher", back_populates="attendance_taken")


class StudentAcademicYear(Base):
    __tablename__ = "student_academic_years"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    class_name = Column("class", String(10), nullable=False)
    section = Column(String(5))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    is_current = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())

    # Relationships
    student = relationship("Student", back_populates="academic_history")
    academic_year = relationship("AcademicYear", back_populates="student_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    table_name = Column(String(50))
    record_id = Column(Integer)
    old_data = Column(JSON)
    new_data = Column(JSON)
    created_at = Column(DateTime, server_default=func.current_timestamp())

    # Relationships
    user = relationship("Teacher", back_populates="audit_logs")