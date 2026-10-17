-- Migration: 001_update_schema.sql
-- Project: Cooperative Loan Management System
-- Purpose: Extend the existing database for loan assessment and ML predictions.
-- Status: Already applied in MySQL Workbench.
-- IMPORTANT: Do not execute this file again on the updated database.

USE cooperative_loan_system;

-- 1. Record how an application was submitted.
ALTER TABLE loan_applications
ADD COLUMN submission_method
ENUM('member_self_service', 'officer_assisted')
NOT NULL DEFAULT 'member_self_service';

-- 2. Ensure each user account maps to at most one member profile.
ALTER TABLE members
ADD CONSTRAINT uq_members_user_id UNIQUE (user_id);

-- 3. Store financial and historical assessment information.
CREATE TABLE loan_application_assessment (
    assessment_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL UNIQUE,

    employment_status VARCHAR(50),
    occupation VARCHAR(100),
    monthly_income DECIMAL(15,2),
    existing_monthly_obligation DECIMAL(15,2),

    savings_balance DECIMAL(15,2),
    share_value DECIMAL(15,2),

    previous_loan_count INT,
    previous_default_count INT,
    previous_repayment_rate DECIMAL(7,6),

    marital_status VARCHAR(30),
    number_of_dependents INT,

    collateral_type VARCHAR(50),
    collateral_value DECIMAL(15,2),
    guarantor_count INT,

    created_by INT NOT NULL,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_assessment_application
        FOREIGN KEY (application_id)
        REFERENCES loan_applications(application_id),

    CONSTRAINT fk_assessment_creator
        FOREIGN KEY (created_by)
        REFERENCES users(user_id),

    CONSTRAINT fk_assessment_updater
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
);

-- 4. Preserve model version and prediction input snapshot.
ALTER TABLE risk_predictions
ADD COLUMN model_version VARCHAR(50),
ADD COLUMN input_snapshot JSON;

-- 5. Track who recorded each repayment.
ALTER TABLE repayments
ADD COLUMN recorded_by INT,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT fk_repayment_recorder
    FOREIGN KEY (recorded_by)
    REFERENCES users(user_id);

-- 6. Improve application filtering by status and date.
CREATE INDEX idx_application_status_date
ON loan_applications (application_status, application_date);