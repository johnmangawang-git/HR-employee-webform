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
        // REVERT TO ORIGINAL v1.0 WORKING SCHEMA (9 basic fields)
        const insertQuery = `
      INSERT INTO applications (
        full_name, email_add, mobile_no, birth_date, current_address,
        signature_name, date_accomplished, digital_signature, profile_picture_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING id;
    `;

        // REVERT TO ORIGINAL v1.0 WORKING VALUES (9 basic fields only)
        values = [];
        
        // Original v1.0 working fields
        values.push(formData.fullName);           // $1
        values.push(formData.emailAdd);           // $2
        values.push(formData.mobileNo);           // $3
        values.push(formData.birthDate);          // $4
        values.push(formData.currentAddress);     // $5
        values.push(formData.signatureName);      // $6
        values.push(formData.dateAccomplished);   // $7
        values.push(formData.digitalSignature);   // $8
        values.push(profilePictureUrl);           // $9
        
        // ORIGINAL v1.0 WORKING FIELDS DEBUG
        console.log('DEBUG: REVERTED TO v1.0 WORKING SCHEMA');
        console.log('Original 9 fields:', values);
        console.log('1. fullName:', values[0]);
        console.log('2. emailAdd:', values[1]);
        console.log('3. mobileNo:', values[2]);
        console.log('4. birthDate:', values[3]);
        console.log('5. currentAddress:', values[4]);
        console.log('6. signatureName:', values[5]);
        console.log('7. dateAccomplished:', values[6]);
        console.log('8. digitalSignature:', values[7]);
        console.log('9. profilePictureUrl:', values[8]);
        console.log('Total values:', values.length, 'Expected: 9');

        console.log('Values array length:', values.length);
        console.log('Expected: 9 values for ORIGINAL v1.0 working schema');
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