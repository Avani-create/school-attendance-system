-- Test Data for School Attendance Management System

-- 1. Insert Academic Year (If not already present)
INSERT INTO academic_years (name, start_date, end_date, is_current)
VALUES ('2026-27', '2026-04-01', '2027-03-31', TRUE)
ON CONFLICT (name) DO UPDATE SET is_current = TRUE;

-- Get Academic Year ID (Assuming it's 1, but we use subqueries)
-- 2. Insert Teachers (Password: 'teacher123' -> hashed)
-- Hashed password value: '$2b$12$Y1p4QjJ3bFmN2X1y3/Jz4e1o.6fM2D6F7rD/h9tQv2fJpOpHlO9XG' (matches 'teacher123')
INSERT INTO teachers (name, email, password_hash, phone, is_admin, is_active)
VALUES 
('Mrs. Gupta', 'gupta@school.com', '$2b$12$Y1p4QjJ3bFmN2X1y3/Jz4e1o.6fM2D6F7rD/h9tQv2fJpOpHlO9XG', '9876543221', FALSE, TRUE),
('Mr. Nair', 'nair@school.com', '$2b$12$Y1p4QjJ3bFmN2X1y3/Jz4e1o.6fM2D6F7rD/h9tQv2fJpOpHlO9XG', '9876543222', FALSE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- 3. Assign classes to Teachers
INSERT INTO teacher_classes (teacher_id, class)
VALUES 
((SELECT id FROM teachers WHERE email = 'gupta@school.com'), '2A'),
((SELECT id FROM teachers WHERE email = 'nair@school.com'), '3A')
ON CONFLICT (teacher_id, class) DO NOTHING;

-- 4. Insert Holidays (Republic day, Independence Day, and a special working Saturday)
INSERT INTO holidays (date, name, academic_year_id, is_working_saturday)
VALUES
('2026-08-15', 'Independence Day', (SELECT id FROM academic_years WHERE name = '2026-27'), FALSE),
('2026-10-02', 'Gandhi Jayanti', (SELECT id FROM academic_years WHERE name = '2026-27'), FALSE),
('2026-07-11', 'Compensatory Saturday (Rain compensation)', (SELECT id FROM academic_years WHERE name = '2026-27'), TRUE)
ON CONFLICT (date, academic_year_id) DO NOTHING;

-- 5. Insert Students for Class 2A
INSERT INTO students (name, class, section, parent_name, parent_phone, address, admission_date, leaving_date, leaving_reason, is_active)
VALUES
('Abhi Krishna', '2A', 'A', 'Krishna Kumar', '9876543201', 'Uliyil, Mattannur', '2026-04-01', NULL, NULL, TRUE),
('Aditya Nair', '2A', 'A', 'Ramesh Nair', '9876543202', 'Thillenkeri, Kakkayangad', '2026-04-01', NULL, NULL, TRUE),
('Anjana Ramesh', '2A', 'A', 'Ramesh P', '9876543203', 'Uliyil Town', '2026-04-01', NULL, NULL, TRUE),
-- Mid-year joiner (Admission starts on October 1st, 2026)
('Fathima Zahra', '2A', 'A', 'Muhammed Ali', '9876543204', 'Iritty, Kannur', '2026-10-01', NULL, NULL, TRUE),
-- Mid-year leaver (Left school on December 15th, 2026)
('Gautham Dev', '2A', 'A', 'Devadas K', '9876543205', 'Thillenkeri, Uliyil', '2026-04-01', '2026-12-15', 'transferred', FALSE);

-- 6. Insert Attendance logs for students
-- Add present logs for early April 2026 (April 1 to April 3, 2026)
INSERT INTO attendance (student_id, date, status, reason, teacher_id)
VALUES
((SELECT id FROM students WHERE name = 'Abhi Krishna'), '2026-04-01', 'present', NULL, (SELECT id FROM teachers WHERE email = 'gupta@school.com')),
((SELECT id FROM students WHERE name = 'Aditya Nair'), '2026-04-01', 'present', NULL, (SELECT id FROM teachers WHERE email = 'gupta@school.com')),
((SELECT id FROM students WHERE name = 'Anjana Ramesh'), '2026-04-01', 'present', NULL, (SELECT id FROM teachers WHERE email = 'gupta@school.com')),
((SELECT id FROM students WHERE name = 'Gautham Dev'), '2026-04-01', 'present', NULL, (SELECT id FROM teachers WHERE email = 'gupta@school.com'));

INSERT INTO attendance (student_id, date, status, reason, teacher_id)
VALUES
((SELECT id FROM students WHERE name = 'Abhi Krishna'), '2026-04-02', 'present', NULL, (SELECT id FROM teachers WHERE email = 'gupta@school.com')),
((SELECT id FROM students WHERE name = 'Aditya Nair'), '2026-04-02', 'absent', 'Fever', (SELECT id FROM teachers WHERE email = 'gupta@school.com')),
((SELECT id FROM students WHERE name = 'Anjana Ramesh'), '2026-04-02', 'present', NULL, (SELECT id FROM teachers WHERE email = 'gupta@school.com')),
((SELECT id FROM students WHERE name = 'Gautham Dev'), '2026-04-02', 'present', NULL, (SELECT id FROM teachers WHERE email = 'gupta@school.com'));
