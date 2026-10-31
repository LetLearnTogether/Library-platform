-- LetLearnTogether Database Schema (MySQL)
-- Created by: Oliver D. Toee (Database Lead)

-- 1. Create and select the database
CREATE DATABASE IF NOT EXISTS letlearn_db;
USE letlearn_db;

-- 2. Create Tables
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Student', 'Lecturer', 'Moderator', 'Admin') NOT NULL DEFAULT 'Student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Platform_Settings (
    id INT PRIMARY KEY DEFAULT 1,
    announcement_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    announcement_message VARCHAR(500),
    support_contact VARCHAR(254),
    registration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    uploads_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by INT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Admin_Activity_Log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_id INT NULL,
    actor_name VARCHAR(100) NOT NULL,
    actor_role VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES Users(id) ON DELETE SET NULL,
    INDEX ix_admin_activity_actor (actor_id),
    INDEX ix_admin_activity_entity (entity_type)
);

CREATE TABLE IF NOT EXISTS Courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    semester ENUM('First', 'Second') NOT NULL,
    lecturer_id INT,
    FOREIGN KEY (lecturer_id) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Course_Announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    author_id INT NOT NULL,
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES Users(id),
    INDEX ix_course_announcements_course (course_id)
);

CREATE TABLE IF NOT EXISTS Course_Enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_course_enrollment_student UNIQUE (course_id, student_id),
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX ix_Course_Enrollments_course_id (course_id),
    INDEX ix_Course_Enrollments_student_id (student_id)
);



CREATE TABLE IF NOT EXISTS Documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    document_type ENUM('Midterm', 'Final', 'Assignment', 'Quiz', 'Syllabus') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    status ENUM('Under Review', 'Verified', 'Rejected', 'Revoked') DEFAULT 'Under Review',
    verification_token VARCHAR(100) UNIQUE,
    uploaded_by INT NOT NULL,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    review_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(id),
    FOREIGN KEY (uploaded_by) REFERENCES Users(id),
    FOREIGN KEY (approved_by) REFERENCES Users(id),
    FOREIGN KEY (reviewed_by) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    submitted_by INT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('Open', 'In Review', 'Resolved', 'Dismissed') NOT NULL DEFAULT 'Open',
    moderator_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES Documents(id),
    FOREIGN KEY (submitted_by) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    is_published BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES Courses(id),
    FOREIGN KEY (created_by) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Quiz_Questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    options JSON NOT NULL, 
    correct_answer_index INT NOT NULL,
    FOREIGN KEY (quiz_id) REFERENCES Quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Quiz_Attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    total_questions INT NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (quiz_id) REFERENCES Quizzes(id)
);

CREATE TABLE IF NOT EXISTS Quiz_Attempt_Answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    question_order INT NOT NULL,
    question_text TEXT NOT NULL,
    options JSON NOT NULL,
    selected_option_index INT NOT NULL,
    correct_option_index INT NOT NULL,
    FOREIGN KEY (attempt_id) REFERENCES Quiz_Attempts(id) ON DELETE CASCADE
);

-- 3. Performance Indexes (unique columns above already have indexes)
CREATE INDEX idx_documents_course ON Documents(course_id);
CREATE INDEX idx_documents_status ON Documents(status);
CREATE INDEX idx_reports_status ON Reports(status);
CREATE INDEX idx_quiz_attempt_answers_attempt ON Quiz_Attempt_Answers(attempt_id);