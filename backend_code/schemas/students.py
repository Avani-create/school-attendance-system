from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional

class StudentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    class_name: str = Field(..., alias="class", min_length=1, max_length=10)
    section: Optional[str] = Field(None, max_length=5)
    parent_name: Optional[str] = Field(None, max_length=100)
    parent_phone: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = None
    admission_date: date = Field(default_factory=date.today)

    class Config:
        populate_by_name = True

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    class_name: Optional[str] = Field(None, alias="class", min_length=1, max_length=10)
    section: Optional[str] = Field(None, max_length=5)
    parent_name: Optional[str] = Field(None, max_length=100)
    parent_phone: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = None
    admission_date: Optional[date] = None
    leaving_date: Optional[date] = None
    leaving_reason: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

    class Config:
        populate_by_name = True

class StudentResponse(StudentBase):
    id: int
    leaving_date: Optional[date] = None
    leaving_reason: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

class StudentPromoteRequest(BaseModel):
    from_class: str = Field(..., min_length=1, max_length=10)
    to_class: str = Field(..., min_length=1, max_length=10)

class StudentDeleteRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=50)
