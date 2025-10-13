-- FinCraft MySQL Database Schema
-- Run this script in MySQL Workbench to create the database and tables

-- Create database
CREATE DATABASE IF NOT EXISTS fincraft_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE fincraft_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(100),
    lastName VARCHAR(100),
    password VARCHAR(255),
    panNumber VARCHAR(10) NOT NULL UNIQUE,
    holderName VARCHAR(200) NOT NULL,
    phoneNumber VARCHAR(10) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    
    -- CIBIL Consent fields
    cibilConsentGranted BOOLEAN DEFAULT FALSE,
    cibilConsentGrantedAt DATETIME NULL,
    cibilConsentExpiresAt DATETIME NULL,
    cibilConsentId VARCHAR(255) NULL,
    cibilAccessToken TEXT NULL,
    
    -- CIBIL Data
    cibilScore INT NULL,
    cibilReportDate DATETIME NULL,
    cibilAccounts JSON NULL,
    
    -- Bank Consents (JSON array)
    bankConsents JSON NULL,
    
    -- Document requests (JSON array)
    documentRequests JSON NULL,
    
    -- Status fields
    isActive BOOLEAN DEFAULT TRUE,
    lastLogin DATETIME NULL,
    
    -- Timestamps
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_email (email),
    INDEX idx_pan (panNumber),
    INDEX idx_phone (phoneNumber),
    INDEX idx_active (isActive)
);

-- OTPs table
CREATE TABLE IF NOT EXISTS otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    otpCode VARCHAR(10) NOT NULL,
    otpType ENUM('cibil_consent', 'bank_consent', 'phone_verification') NOT NULL,
    phoneNumber VARCHAR(10) NULL,
    panNumber VARCHAR(10) NULL,
    accountId VARCHAR(255) NULL,
    bankName VARCHAR(100) NULL,
    attempts INT DEFAULT 0,
    isVerified BOOLEAN DEFAULT FALSE,
    expiresAt DATETIME NOT NULL,
    
    -- Timestamps
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_identifier (identifier),
    INDEX idx_created (createdAt),
    INDEX idx_expires (expiresAt)
);

-- Sample data (optional)
-- INSERT INTO users (
--     firstName, lastName, email, phoneNumber, panNumber, holderName, password
-- ) VALUES (
--     'Test', 'User', 'test@example.com', '9876543210', 'ABCDE1234F', 'Test User',
--     '$2a$12$example_hashed_password'
-- );

SHOW TABLES;