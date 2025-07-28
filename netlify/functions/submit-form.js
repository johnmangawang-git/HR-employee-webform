// Native Netlify function for form submission (without Express)
const { Pool } = require('pg'); // PostgreSQL client for Supabase
// ExcelJS removed (only used for email attachments)
// Email functionality removed as requested
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

// Email transporter removed as requested

// Excel generation function removed (only used for email)

exports.handler = async (event, context) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    try {

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
    console.log('=== CLOUDINARY DEBUG START ===');
    console.log('Has profilePictureBase64:', !!formData.profilePictureBase64);
    console.log('Base64 length:', formData.profilePictureBase64 ? formData.profilePictureBase64.length : 0);
    console.log('Cloudinary config check:');
    console.log('- Cloud name:', !!process.env.CLOUDINARY_CLOUD_NAME);
    console.log('- API key:', !!process.env.CLOUDINARY_API_KEY);
    console.log('- API secret:', !!process.env.CLOUDINARY_API_SECRET);
    
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
            console.log('Upload result:', uploadResult);
        } catch (uploadError) {
            console.error('Error uploading to Cloudinary:', uploadError);
            console.error('Upload error details:', uploadError.message);
            // Continue without image - don't fail the entire form submission
            console.log('Continuing form submission without profile picture');
        }
    } else {
        console.log('No profile picture base64 data found');
    }
    console.log('=== CLOUDINARY DEBUG END ===');

    // --- Database Integration (PostgreSQL via Supabase) ---
    let newRecordId;
    let values; // Declare values outside try block for error handling
    
    try {
        // Prepare data for insertion. Ensure all fields are handled.
        // INSERT with ONLY existing database columns (family fields don't exist in actual DB yet)
        const insertQuery = `
      INSERT INTO applications (
        full_name, nick_name, mobile_no, email_add, birth_date, civil_status, age, birth_place,
        nationality, religion, sss_no, philhealth_no, hdmf_no, national_id_no, drivers_license, tin_no,
        current_address, provincial_address,
        father_name, father_occupation, father_age, father_contact_no,
        mother_name, mother_occupation, mother_age, mother_contact_no,
        prev_company_1, position_1, dates_employed_1, reason_for_leaving_1,
        key_skills, certifications, languages,
        ref_1_name, ref_1_relationship,
        past_employment_issues, past_employment_issues_specify,
        profile_picture_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34
      ) RETURNING id;
    `;

        // 50 values array matching ONLY existing database columns (excluding family fields)
        values = [];
        
        // Personal Information (10 fields)
        values.push(formData.fullName);
        values.push(formData.nickName);
        values.push(formData.mobileNo);
        values.push(formData.emailAdd);
        values.push(formData.birthDate);
        values.push(formData.civilStatus);
        values.push(formData.age);
        values.push(formData.birthPlace);
        values.push(formData.nationality);
        values.push(formData.religion);
        
        // Government IDs (6 fields)
        values.push(formData.sssNo);
        values.push(formData.philhealthNo);
        values.push(formData.hdmfNo);
        values.push(formData.nationalIdNo);
        values.push(formData.driversLicense);
        values.push(formData.tinNo);
        
        // Address Information (2 fields)
        values.push(formData.currentAddress);
        values.push(formData.provincialAddress);
        
        // Family Background - Parents ONLY (8 fields)
        values.push(formData.fatherName);
        values.push(formData.fatherOccupation);
        values.push(formData.fatherAge);
        values.push(formData.fatherContactNo);
        values.push(formData.motherName);
        values.push(formData.motherOccupation);
        values.push(formData.motherAge);
        values.push(formData.motherContactNo);
        
        // SKIP: Spouse, Siblings, Children fields - not in actual database yet
        
        // Employment History (4 fields) - REMOVED 4 MORE TO GET TO 41
        values.push(formData.prevCompany1);
        values.push(formData.position1);
        values.push(formData.datesEmployed1);
        values.push(formData.reasonForLeaving1);
        // REMOVED: prevCompany2, position2, datesEmployed2, reasonForLeaving2
        
        // Competencies (3 fields)
        values.push(formData.keySkills);
        values.push(formData.certifications);
        values.push(formData.languages);
        
        // Character References (2 fields) - REMOVED 4 MORE TO GET TO 45
        values.push(formData.ref1Name);
        values.push(formData.ref1Relationship);
        // REMOVED: ref1ContactNo, ref2Name, ref2Relationship, ref2ContactNo
        
        // Background Check Questions (2 fields only - removing 4 fields to get to 50 total)
        values.push(formData.pastEmploymentIssues);
        values.push(formData.pastEmploymentIssuesSpecify);
        // REMOVED: legalIssues, legalIssuesSpecify, medicalHistory, medicalHistorySpecify
        
        // Signature+File (1 field) - REMOVED 3 MORE TO GET TO 37
        values.push(profilePictureUrl);
        // REMOVED: signatureName, dateAccomplished, digitalSignature
        
        // Need to remove 4 values to get exactly 50 - let me check what's extra
        console.log('DEBUG: Values count breakdown:');
        console.log('Personal (10):', values.slice(0, 10));
        console.log('Government IDs (6):', values.slice(10, 16));
        console.log('Address (2):', values.slice(16, 18));
        console.log('Parents (8):', values.slice(18, 26));
        console.log('Employment (4):', values.slice(26, 30));
        console.log('Competencies (3):', values.slice(30, 33));
        console.log('References (2):', values.slice(33, 35));
        console.log('Background (2):', values.slice(35, 37));
        console.log('File (1):', values.slice(37, 38));
        console.log('Total values:', values.length, 'Expected: 34');

        console.log('Values array length:', values.length);
        console.log('Expected: 34 values for existing database columns only');
        console.log('Profile picture URL:', profilePictureUrl);
        console.log('Using INSERT with existing database columns only (no family fields)');
        
        // Debug: Log ALL values to identify the issue
        console.log('ALL VALUES:', values);
        console.log('First 10 values:', values.slice(0, 10));
        console.log('Last 10 values:', values.slice(-10));
        
        // Count non-undefined values
        const nonUndefinedValues = values.filter(v => v !== undefined);
        console.log('Non-undefined values count:', nonUndefinedValues.length);

        const result = await pool.query(insertQuery, values);
        newRecordId = result.rows[0].id; // Get the ID of the newly inserted row

        console.log('Data saved to PostgreSQL with ID:', newRecordId);

    } catch (error) {
        console.error('Database error or server-side validation issue:', error);
        console.error('Error details:', error.stack);
        console.error('Values array:', values || 'undefined');
        console.error('Values length:', values ? values.length : 'undefined');
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                message: 'Error saving form data to database.', 
                error: error.message,
                details: error.code || 'Unknown error code',
                valuesLength: values ? values.length : 'undefined'
            }),
        };
    }

    // Email functionality removed as requested
    console.log('Form submission completed successfully - no email sent');
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
            message: 'Form submitted successfully!', 
            dataId: newRecordId,
            imageUrl: profilePictureUrl 
        }),
    };

    } catch (unexpectedError) {
        console.error('Unexpected error in handler:', unexpectedError);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                message: 'Unexpected server error occurred.', 
                error: unexpectedError.message || 'Unknown error'
            }),
        };
    }
};