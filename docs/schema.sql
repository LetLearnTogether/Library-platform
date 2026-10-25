-- LetLearnTogether Database Schema (MySQL)
-- Created by: Oliver D. Toee (Database Lead)

CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Student', 'Lecturer', 'Moderator', 'Admin') NOT NULL DEFAULT 'Student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    semester ENUM('First', 'Second') NOT NULL,
    lecturer_id INT,
    FOREIGN KEY (lecturer_id) REFERENCES Users(id)
);

CREATE TABLE Documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    document_type ENUM('Midterm', 'Final', 'Assignment', 'Quiz', 'Syllabus') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    status ENUM('Under Review', 'Verified', 'Rejected', 'Revoked') DEFAULT 'Under Review',
    verification_token VARCHAR(100) UNIQUE,
    uploaded_by INT NOT NULL,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(id),
    FOREIGN KEY (uploaded_by) REFERENCES Users(id),
    FOREIGN KEY (approved_by) REFERENCES Users(id)
);

CREATE TABLE Quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    is_published BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES Courses(id),
    FOREIGN KEY (created_by) REFERENCES Users(id)
);

CREATE TABLE Quiz_Questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    options JSON NOT NULL, 
    correct_answer_index INT NOT NULL,
    FOREIGN KEY (quiz_id) REFERENCES Quizzes(id) ON DELETE CASCADE
);

CREATE TABLE Quiz_Attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (quiz_id) REFERENCES Quizzes(id)
);