# School Attendance System API Documentation

Base URL: `/api/v1`

All responses are JSON unless specified otherwise.

---

## Authentication

### POST `/auth/login`
Authenticates a teacher or admin and returns a JWT token.

**Request Body:**
```json
{
  "email": "teacher@school.com",
  "password": "securepassword"
}
```

**Response (Success - 200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "Mrs. Gupta",
    "email": "teacher@school.com",
    "is_admin": false,
    "classes": ["2A", "2B"]
  }
}
```

### POST `/auth/refresh`
Refreshes the current authentication session.

**Response (Success - 200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer"
}
```

---

## Attendance Management

### POST `/attendance/bulk`
Submit daily attendance records for an entire class.

**Request Body:**
```json
{
  "class_name": "2A",
  "date": "2026-06-21",
  "absent_student_ids": [4, 12],
  "reasons": {
    "4": "Fever",
    "12": "Family trip"
  }
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "saved_count": 28
}
```

### GET `/attendance/student/{student_id}`
Get summary and breakdown of attendance for a specific student between dates.

**Query Parameters:**
- `from_date` (YYYY-MM-DD)
- `to_date` (YYYY-MM-DD)

**Response (200 OK):**
```json
{
  "student": {
    "id": 4,
    "name": "Aditya Nair",
    "class": "2A",
    "section": "A",
    "admission_date": "2026-04-01"
  },
  "summary": {
    "total_days": 45,
    "present": 42,
    "absent": 3,
    "percentage": 93.3,
    "monthly_breakdown": [
      { "month": "April 2026", "present": 20, "absent": 1 },
      { "month": "May 2026", "present": 22, "absent": 2 }
    ]
  }
}
```

### GET `/attendance/class/{class_name}`
Get attendance breakdown for all students in a class.

**Query Parameters:**
- `from_date` (YYYY-MM-DD)
- `to_date` (YYYY-MM-DD)

**Response (200 OK):**
```json
{
  "class_name": "2A",
  "students": [
    {
      "id": 1,
      "name": "Abhi Krishna",
      "present": 44,
      "absent": 1,
      "percentage": 97.8
    },
    {
      "id": 4,
      "name": "Aditya Nair",
      "present": 42,
      "absent": 3,
      "percentage": 93.3
    }
  ]
}
```

### GET `/attendance/today`
Fetch dashboard stats for today's overall attendance.

**Response (200 OK):**
```json
{
  "date": "2026-06-21",
  "total_students": 250,
  "present_count": 235,
  "absent_count": 15,
  "percentage": 94.0,
  "class_wise": [
    { "class_name": "1A", "present": 28, "total": 30, "percentage": 93.3 },
    { "class_name": "2A", "present": 28, "total": 30, "percentage": 93.3 }
  ]
}
```

---

## Reports & Downloads

### GET `/reports/student/{student_id}`
Generates a PDF report for a single student.
**Query Parameters:**
- `from_date` (YYYY-MM-DD)
- `to_date` (YYYY-MM-DD)
**Response:** Binary PDF stream

### GET `/reports/class/{class_name}`
Generates a bulk PDF report for an entire class.
**Query Parameters:**
- `from_date` (YYYY-MM-DD)
- `to_date` (YYYY-MM-DD)
**Response:** Binary PDF stream

### GET `/reports/class/{class_name}/tc`
Generates a specialized "TC Ready" PDF report for an entire class containing student name, total working days, present days, absent days, and percentage.
**Query Parameters:**
- `from_date` (YYYY-MM-DD)
- `to_date` (YYYY-MM-DD)
**Response:** Binary PDF stream

---

## Student CRUD (Admin Only)

### GET `/students`
**Query Parameters:**
- `class_name` (optional)
- `active_only` (optional, default: true)
**Response (200 OK):**
```json
{
  "students": [
    {
      "id": 4,
      "name": "Aditya Nair",
      "class": "2A",
      "section": "A",
      "parent_name": "Ramesh Nair",
      "parent_phone": "9876543210",
      "admission_date": "2026-04-01",
      "leaving_date": null,
      "leaving_reason": null,
      "is_active": true
    }
  ]
}
```

### POST `/students`
Create a new student.
**Request Body:**
```json
{
  "name": "Aditya Nair",
  "class_name": "2A",
  "section": "A",
  "parent_name": "Ramesh Nair",
  "parent_phone": "9876543210",
  "address": "123 Street, Uliyil",
  "admission_date": "2026-04-01"
}
```
**Response (201 Created):** Created student object.

### PUT `/students/{student_id}`
Update student details.
**Response (200 OK):** Updated student object.

### DELETE `/students/{student_id}`
Soft-delete a student.
**Request Body:**
```json
{
  "reason": "transferred"
}
```
**Response (200 OK):** `{"success": true}`

### POST `/students/promote`
Bulk promote students from one class to another.
**Request Body:**
```json
{
  "from_class": "1A",
  "to_class": "2A"
}
```
**Response (200 OK):** `{"success": true, "promoted_count": 30}`

---

## Teachers Management (Admin Only)

### GET `/teachers`
**Response:** List of all teachers.

### POST `/teachers`
**Request Body:**
```json
{
  "name": "Mrs. Gupta",
  "email": "teacher@school.com",
  "password": "securepassword",
  "phone": "9876543211",
  "is_admin": false
}
```

### PUT `/teachers/{teacher_id}`
Updates details or `is_admin` status.

### DELETE `/teachers/{teacher_id}`
Soft deletes a teacher.

### POST `/teachers/{teacher_id}/classes`
Assigns classes to a teacher.
**Request Body:**
```json
{
  "classes": ["2A", "2B"]
}
```

### DELETE `/teachers/{teacher_id}/classes/{class_name}`
Removes a class assignment from a teacher.

---

## Academic Years & Holidays (Admin Only)

### GET `/academic-years`
Returns list of all academic years.

### POST `/academic-years`
**Request Body:**
```json
{
  "name": "2026-27",
  "start_date": "2026-04-01",
  "end_date": "2027-03-31",
  "is_current": true
}
```

### PUT `/academic-years/{year_id}`
Updates details or sets standard academic year as current.

### GET `/holidays`
**Query Parameters:**
- `year_id`
**Response:** List of holidays for that academic year.

### POST `/holidays`
Add a holiday or a Compensatory Working Saturday.
**Request Body:**
```json
{
  "date": "2026-07-15",
  "name": "Compensatory Day",
  "academic_year_id": 1,
  "is_working_saturday": true
}
```

### DELETE `/holidays/{holiday_id}`
Delete a holiday entry.
