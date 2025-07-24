// netlify/functions/submit-form.js
const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const { Pool } = require('pg'); // PostgreSQL client

const app = express();

// Use body-parser to parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS for all origins (for development, restrict in production)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // IMPORTANT: Replace * with your Netlify domain in production (e.g., 'https://your-site-name.netlify.app')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize PostgreSQL Pool for Supabase
// Database credentials will be pulled from Netlify Environment Variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // This will be your Supabase connection string
  ssl: {
    rejectUnauthorized: false // Required for Supabase connections from serverless environments
  }
});

// Define the API endpoint for form submission
app.post('/.netlify/functions/submit-form', async (req, res) => {
  const formData = req.body;

  if (!formData) {
    return res.status(400).json({ message: 'No form data provided.' });
  }

  // --- Server-side Validation ---
  const errors = {};

  // Example validation rules (expand as needed for all fields)
  if (!formData.fullName || formData.fullName.trim() === '') {
    errors.fullName = 'Full Name is required.';
  }
  if (!formData.emailAdd || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/.test(formData.emailAdd)) {
    errors.emailAdd = 'Valid Email Address is required.';
  }
  if (!formData.mobileNo || !/^[0-9]{10,15}$/.test(formData.mobileNo)) {
    errors.mobileNo = 'Valid Mobile Number (10-15 digits) is required.';
  }
  if (!formData.birthDate) {
    errors.birthDate = 'Birth Date is required.';
  }
  if (formData.age && (parseInt(formData.age) < 18 || parseInt(formData.age) > 100)) {
    errors.age = 'Age must be between 18 and 100.';
  }
  if (!formData.currentAddress || formData.currentAddress.trim() === '') {
    errors.currentAddress = 'Current Address is required.';
  }
  if (!formData.signatureName || formData.signatureName.trim() === '') {
    errors.signatureName = 'Signature Over Complete Name is required.';
  }
  if (!formData.dateAccomplished) {
    errors.dateAccomplished = 'Date Accomplished is required.';
  }
  // For digital signature, check if it's present if required
  if (formData.digitalSignature === null || formData.digitalSignature === '') { // Check for null or empty string
      errors.digitalSignature = 'Digital Signature is required.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors: errors });
  }

  // --- Database Integration (PostgreSQL via Supabase) ---
  try {
    // Prepare data for insertion. Ensure all fields are handled.
    // For complex objects or arrays, you might need to JSON.stringify them.
    const insertQuery = `
      INSERT INTO applications (
        full_name, email_add, mobile_no, birth_date, civil_status, age, birth_place,
        nationality, religion, sss_no, philhealth_no, hdmf_no, national_id_no,
        drivers_license, tin_no, current_address, provincial_address,
        father_name, father_occupation, father_age, father_contact_no,
        mother_name, mother_occupation, mother_age, mother_contact_no,
        prev_company_1, position_1, dates_employed_1, reason_for_leaving_1,
        prev_company_2, position_2, dates_employed_2, reason_for_leaving_2,
        key_skills, certifications, languages,
        ref_1_name, ref_1_relationship, ref_1_contact_no,
        ref_2_name, ref_2_relationship, ref_2_contact_no,
        past_employment_issues, past_employment_issues_specify,
        legal_issues, legal_issues_specify,
        medical_history, medical_history_specify,
        referred_by, signature_name, date_accomplished, digital_signature,
        profile_picture_name, submission_timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33,
        $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, NOW()
      ) RETURNING id;
    `;

    const values = [
      formData.fullName, formData.emailAdd, formData.mobileNo, formData.birthDate, formData.civilStatus, formData.age, formData.birthPlace,
      formData.nationality, formData.religion, formData.sssNo, formData.philhealthNo, formData.hdmfNo, formData.nationalIdNo,
      formData.driversLicense, formData.tinNo, formData.currentAddress, formData.provincialAddress,
      formData.fatherName, formData.fatherOccupation, formData.fatherAge, formData.fatherContactNo,
      formData.motherName, formData.motherOccupation, formData.motherAge, formData.motherContactNo,
      formData.prevCompany1, formData.position1, formData.datesEmployed1, formData.reasonForLeaving1,
      formData.prevCompany2, formData.position2, formData.datesEmployed2, formData.reasonForLeaving2,
      formData.keySkills, formData.certifications, formData.languages,
      formData.ref1Name, formData.ref1Relationship, formData.ref1ContactNo,
      formData.ref2Name, formData.ref2Relationship, formData.ref2ContactNo,
      formData.pastEmploymentIssues, formData.pastEmploymentIssuesSpecify,
      formData.legalIssues, formData.legalIssuesSpecify,
      formData.medicalHistory, formData.medicalHistorySpecify,
      formData.referredBy, formData.signatureName, formData.dateAccomplished, formData.digitalSignature,
      formData.profilePictureName
    ];

    const result = await pool.query(insertQuery, values);
    const newRecordId = result.rows[0].id; // Get the ID of the newly inserted row

    console.log('Data saved to PostgreSQL with ID:', newRecordId);

    // You could send email/SMS notifications here if configured
    // Example: sendEmailNotification(formData);

    res.status(200).json({ message: 'Form submitted successfully!', dataId: newRecordId });

  } catch (error) {
    console.error('Database error or server-side validation issue:', error);
    res.status(500).json({ message: 'Error saving form data.', error: error.message });
  }
});

// Export the handler for Netlify
exports.handler = serverless(app);