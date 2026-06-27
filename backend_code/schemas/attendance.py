from pydantic import BaseModel, Field
from datetime import date
from typing import List, Dict, Optional

class AttendanceBulkCreate(BaseModel):
    class_name: str = Field(..., alias="class_id") # Map class_id input from front-end
    date: date
    absent_student_ids: List[int]
    reasons: Dict[int, str]

    class Config:
        populate_by_name = True

class MonthlyBreakdownItem(BaseModel):
    month: str
    present: int
    absent: int

class StudentSummary(BaseModel):
    total_days: int
    present: int
    absent: int
    percentage: float
    monthly_breakdown: List[MonthlyBreakdownItem]

class StudentAttendanceReportResponse(BaseModel):
    student: dict
    summary: StudentSummary

class ClassStudentAttendanceItem(BaseModel):
    id: int
    name: str
    present: int
    absent: int
    percentage: float

class ClassAttendanceReportResponse(BaseModel):
    class_name: str
    students: List[ClassStudentAttendanceItem]

class ClassWiseTodayStats(BaseModel):
    class_name: str
    present: int
    total: int
    percentage: float

class TodayAttendanceStatsResponse(BaseModel):
    date: date
    total_students: int
    present_count: int
    absent_count: int
    percentage: float
    class_wise: List[ClassWiseTodayStats]
