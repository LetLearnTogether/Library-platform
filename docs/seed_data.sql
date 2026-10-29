-- LetLearnTogether Seed Data (For Local Testing)
-- Run this AFTER running schema.sql

USE letlearn_db;

-- 1. Insert Dummy Users (Passwords are bcrypt hash of 'password123' for testing)
INSERT INTO Users (name, email, password_hash, role) VALUES
('Oliver Toee', 'oliver@letlearn.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGfaEA7u', 'Admin'),
('Prof. Kwitee Gaylah', 'kwitee@letlearn.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGfaEA7u', 'Lecturer'),
('Alice Student', 'alice@letlearn.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGfaEA7u', 'Student'),
('Richard Mod', 'richard@letlearn.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGfaEA7u', 'Moderator');

-- 2. Insert Dummy Courses
INSERT INTO Courses (course_code, course_title, year, semester, lecturer_id) VALUES
('CS101', 'Intro to Programming', 2025, 'First', 2),
('CS202', 'Data Structures', 2025, 'First', 2),
('MTH101', 'Calculus I', 2024, 'Second', 2);

-- 3. Insert Dummy Documents (1 Verified, 1 Under Review)
INSERT INTO Documents (course_id, document_type, file_path, status, verification_token, uploaded_by, approved_by) VALUES
(1, 'Midterm', '/uploads/cs101_midterm_2025.pdf', 'Verified', 'tok_a1b2c3d4e5f6', 3, 2),
(1, 'Final', '/uploads/cs101_final_2025.pdf', 'Under Review', NULL, 3, NULL);

-- 4. Insert Dummy Quiz
INSERT INTO Quizzes (course_id, title, type, is_published, created_by) VALUES
(1, 'CS101 Midterm Practice', 'MCQ', TRUE, 2);

SELECT 'Seed data inserted successfully!' AS Status;