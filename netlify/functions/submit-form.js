// Native Netlify function for form submission (without Express)
const { Pool } = require('pg'); // PostgreSQL client for Supabase
const ExcelJS = require('exceljs'); // For Excel file generation
const nodemailer = require('nodemailer'); // For sending emails
const cloudinary = require('cloudinary').v2; // For image upload

// Initialize PostgreSQL Pool for Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Supabase connection string from Netlify Environment Variable
    ssl: {
        rejectUnauthorized: false // Required for Supabase connections from serverless environments
    }
});

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
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

exports.handler = async (event, context) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }

    let formData;
    try {
        formData = JSON.parse(event.body);
        console.log('Form data received:', formData);
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Invalid JSON' }),
        };
    }

    if (!formData) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'No form data provided.' }),
        };
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
    // For digital signature (now checkbox agreement), check if it's present if required
    if (formData.digitalSignature !== 'agreed') {
        errors.digitalSignature = 'You must agree to the certification to proceed.';
    }

    if (Object.keys(errors).length > 0) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Validation failed', errors: errors }),
        };
    }

    // --- File Upload to Cloudinary ---
    let profilePictureUrl = null;
    if (formData.profilePictureBase64) {
        try {
            console.log('Uploading profile picture to Cloudinary...');
            const uploadResult = await cloudinary.uploader.upload(formData.profilePictureBase64, {
                folder: 'hr-applications', // Organize uploads in a folder
                public_id: `profile_${Date.now()}_${formData.fullName.replace(/\s+/g, '_')}`, // Unique filename
                resource_type: 'image',
                transformation: [
                    { width: 400, height: 400, crop: 'fill' }, // Resize to 400x400
                    { quality: 'auto' } // Optimize quality
                ]
            });
            
            profilePictureUrl = uploadResult.secure_url;
            console.log('Profile picture uploaded successfully:', profilePictureUrl);
        } catch (uploadError) {
            console.error('Error uploading to Cloudinary:', uploadError);
            // Continue without image - don't fail the entire form submission
            console.log('Continuing form submission without profile picture');
        }
    }

    // --- Database Integration (PostgreSQL via Supabase) ---
    let newRecordId;
    try {
        // Prepare data for insertion. Ensure all fields are handled.
        // Complete INSERT with ALL form fields
        const insertQuery = `
      INSERT INTO applications (
        full_name, nick_name, mobile_no, email_add, birth_date, civil_status, age, birth_place,
        nationality, religion, sss_no, philhealth_no, hdmf_no, national_id_no, drivers_license, tin_no,
        current_address, provincial_address,
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
        profile_picture_url, submission_timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44,
        $45, $46, $47, $48, $49, $50, $51, NOW()
      ) RETURNING id;
    `;

        // Complete values array with ALL form fields
        const values = [
            formData.fullName, formData.nickName, formData.mobileNo, formData.emailAdd, 
            formData.birthDate, formData.civilStatus, formData.age, formData.birthPlace,
            formData.nationality, formData.religion, formData.sssNo, formData.philhealthNo, 
            formData.hdmfNo, formData.nationalIdNo, formData.driversLicense, formData.tinNo,
            formData.currentAddress, formData.provincialAddress,
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
            profilePictureUrl // URL from Cloudinary upload
        ];

        console.log('Values array length:', values.length);
        console.log('Expected: 50 values for database columns');
        console.log('Using complete INSERT with ALL form fields');
        
        // Debug: Log first few values to see what we're inserting
        console.log('First 10 values:', values.slice(0, 10));
        console.log('Last 10 values:', values.slice(-10));

        const result = await pool.query(insertQuery, values);
        newRecordId = result.rows[0].id; // Get the ID of the newly inserted row

        console.log('Data saved to PostgreSQL with ID:', newRecordId);

    } catch (error) {
        console.error('Database error or server-side validation issue:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Error saving form data to database.', error: error.message }),
        };
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
                // Digital signature is now a checkbox agreement, no separate attachment needed
            ],
        });

        console.log('Email sent successfully!');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Form submitted and email sent successfully!', dataId: newRecordId }),
        };

    } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Even if email fails, we should still confirm form submission to user if DB save was successful
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'Form submitted successfully, but failed to send email notification.', 
                dataId: newRecordId, 
                emailError: emailError.message 
            }),
        };
    }
};