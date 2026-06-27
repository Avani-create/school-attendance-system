from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class AcademicYearBase(BaseModel):
    name: str = Field(..., min_length=4, max_length=20)
    start_date: date
    end_date: date
    is_current: bool = False

class AcademicYearCreate(AcademicYearBase):
    pass

class AcademicYearUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=4, max_length=20)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None

class AcademicYearResponse(AcademicYearBase):
    id: int

    class Config:
        from_attributes = True

class HolidayBase(BaseModel):
    date: date
    name: str = Field(..., min_length=1, max_length=100)
    academic_year_id: int
    is_working_saturday: bool = False

class HolidayCreate(HolidayBase):
    pass

class HolidayResponse(HolidayBase):
    id: int

    class Config:
        from_attributes = True
