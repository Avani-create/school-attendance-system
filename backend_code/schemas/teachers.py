from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List

class TeacherBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=15)
    is_admin: bool = False

class TeacherCreate(TeacherBase):
    password: str = Field(..., min_length=6)

class TeacherUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    phone: Optional[str] = Field(None, max_length=15)
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None

class TeacherResponse(TeacherBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    classes: List[str] = []

    class Config:
        from_attributes = True

        @classmethod
        def model_validate(cls, obj, **kwargs):
            # Flatten classes relationship to list of string class names
            instance = super().model_validate(obj, **kwargs)
            if hasattr(obj, 'classes'):
                instance.classes = [c.class_name for c in obj.classes]
            return instance

class TeacherClassAssignment(BaseModel):
    classes: List[str]

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: TeacherResponse

class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
