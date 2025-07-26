-- HR Employee Webform v2.0 - Complete Database Schema
-- Run this in your PostgreSQL/Supabase database

-- Drop existing table if you want to start fresh (CAUTION: This will delete all data!)
-- DROP TABLE IF EXISTS applications;

-- Create complete applications table with all form fields
CREATE TABLE IF NOT EXISTS applications (
    -- Primary key
    id SERIAL PRIMARY KEY,
    
    -- Personal Information
    full_name VARCHAR(255) NOT NULL,
    nick_name VARCHAR(100),
    mobile_no VARCHAR(20) NOT NULL,
    email_add VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    civil_status VARCHAR(20),
    age INTEGER,
    birth_place VARCHAR(255),
    nationality VARCHAR(100),
    religion VARCHAR(100),
    
    -- Government IDs
    sss_no VARCHAR(20),
    philhealth_no VARCHAR(20),
    hdmf_no VARCHAR(20),
    national_id_no VARCHAR(50),
    drivers_license VARCHAR(50),
    tin_no VARCHAR(20),
    
    -- Address Information
    current_address TEXT NOT NULL,
    provincial_address TEXT,
    
    -- Family Background
    father_name VARCHAR(255),
    father_occupation VARCHAR(255),
    father_age INTEGER,
    father_contact_no VARCHAR(20),
    mother_name VARCHAR(255),
    mother_occupation VARCHAR(255),
    mother_age INTEGER,
    mother_contact_no VARCHAR(20),
    
    -- Employment History
    prev_company_1 VARCHAR(255),
    position_1 VARCHAR(255),
    dates_employed_1 VARCHAR(100),
    reason_for_leaving_1 TEXT,
    prev_company_2 VARCHAR(255),
    position_2 VARCHAR(255),
    dates_employed_2 VARCHAR(100),
    reason_for_leaving_2 TEXT,
    
    -- Competencies
    key_skills TEXT,
    certifications TEXT,
    languages VARCHAR(255),
    
    -- Character References
    ref_1_name VARCHAR(255),
    ref_1_relationship VARCHAR(100),
    ref_1_contact_no VARCHAR(20),
    ref_2_name VARCHAR(255),
    ref_2_relationship VARCHAR(100),
    ref_2_contact_no VARCHAR(20),
    
    -- Background Check Questions
    past_employment_issues VARCHAR(10), -- 'yes' or 'no'
    past_employment_issues_specify TEXT,
    legal_issues VARCHAR(10), -- 'yes' or 'no'
    legal_issues_specify TEXT,
    medical_history VARCHAR(10), -- 'yes' or 'no'
    medical_history_specify TEXT,
    
    -- Additional Information
    referred_by VARCHAR(255),
    
    -- Signature and Completion
    signature_name VARCHAR(255) NOT NULL,
    date_accomplished DATE NOT NULL,
    digital_signature VARCHAR(50) NOT NULL, -- 'agreed' for checkbox
    
    -- File Upload
    profile_picture_url VARCHAR(500), -- URL to uploaded image
    
    -- System Fields
    submission_timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email_add);
CREATE INDEX IF NOT EXISTS idx_applications_submission_date ON applications(submission_timestamp);
CREATE INDEX IF NOT EXISTS idx_applications_full_name ON applications(full_name);

-- Add comments for documentation
COMMENT ON TABLE applications IS 'HR Employee Application Form Submissions - v2.0';
COMMENT ON COLUMN applications.digital_signature IS 'Checkbox agreement - stores "agreed" when user accepts terms';
COMMENT ON COLUMN applications.profile_picture_url IS 'URL to uploaded profile picture (Cloudinary/Supabase Storage)';

-- Sample query to verify structure
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'applications' ORDER BY ordinal_position;