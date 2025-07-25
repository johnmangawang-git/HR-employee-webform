// netlify/functions/submit-form.js
const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const { Pool } = require('pg'); // PostgreSQL client for Supabase
const ExcelJS = require('exceljs'); // For Excel file generation
const nodemailer = require('nodemailer'); // For sending emails

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
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Supabase connection string from Netlify Environment Variable
    ssl: {
        rejectUnauthorized: false // Required for Supabase connections from serverless environments
    }
});

// Configure Nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // Use 'true' if port is 465 (SSL/TLS), 'false' otherwise
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Function to generate Excel buffer from form data
async function generateExcelBuffer(formData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('HR Application Data');

    // Define columns - you can customize this to order/select fields
    const columns = Object.keys(formData).map(key => ({
        header: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), // Convert camelCase to Title Case
        key: key,
        width: 25
    }));
    worksheet.columns = columns;

    // Add data row
    worksheet.addRow(formData);

    // Auto-fit columns (optional, can be performance heavy for many columns)
    worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, function (cell) {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2; // Minimum width 10, plus some padding
    });

    // Generate buffer
    return await workbook.xlsx.writeBuffer();
}

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
    let newRecordId;
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
        newRecordId = result.rows[0].id; // Get the ID of the newly inserted row

        console.log('Data saved to PostgreSQL with ID:', newRecordId);

    } catch (error) {
        console.error('Database error or server-side validation issue:', error);
        return res.status(500).json({ message: 'Error saving form data to database.', error: error.message });
    }

    // --- Email Sending with Excel Attachment ---
    try {
        const excelBuffer = await generateExcelBuffer(formData);
        const emailRecipient = process.env.RECIPIENT_EMAIL || 'john.mangawang@smegphilippines.com'; // Use env var or fallback

        await transporter.sendMail({
            from: process.env.SENDER_EMAIL, // Sender email from environment variable
            to: emailRecipient,
            subject: `New HR Application Form Submission - ID: ${newRecordId}`,
            html: `
        <p>Dear HR Team,</p>
        <p>A new HR application form has been submitted. Details are attached in the Excel file.</p>
        <p><strong>Applicant Name:</strong> ${formData.fullName || 'N/A'}</p>
        <p><strong>Email:</strong> ${formData.emailAdd || 'N/A'}</p>
        <p><strong>Mobile:</strong> ${formData.mobileNo || 'N/A'}</p>
        <p>You can find the full details in the attached spreadsheet.</p>
        <p>Thank you,</p>
        <p>Your HR Application System</p>
      `,
            attachments: [
                {
                    filename: `HR_Application_${formData.fullName.replace(/\s/g, '_')}_${newRecordId}.xlsx`,
                    content: excelBuffer,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            ],
        });

        console.log('Email sent successfully!');
        res.status(200).json({ message: 'Form submitted and email sent successfully!', dataId: newRecordId });

    } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Even if email fails, we should still confirm form submission to user if DB save was successful
        res.status(200).json({ message: 'Form submitted successfully, but failed to send email notification.', dataId: newRecordId, emailError: emailError.message });
    }
});

// Export the handler for Netlify
exports.handler = serverless(app);