// Native Netlify function for data download (without Express)
const ExcelJS = require('exceljs'); // Import ExcelJS
const JSZip = require('jszip'); // For creating ZIP files with multiple files
const { Pool } = require('pg'); // PostgreSQL client for database connection

// Define the API endpoint for downloading data
exports.handler = async (event, context) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

    let requestData;
    try {
        requestData = JSON.parse(event.body);
        console.log('Request data received:', requestData);
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Invalid JSON' }),
        };
    }

    const { username, password } = requestData;

    console.log('=== ADMIN LOGIN DEBUG ===');
    console.log('Received username:', username);
    console.log('Received password length:', password ? password.length : 0);

    // Trim whitespace from inputs
    const trimmedUsername = username ? username.trim() : '';
    const trimmedPassword = password ? password.trim() : '';

    // --- Admin Authentication (IMPORTANT: Use environment variables in production) ---
    const ADMIN_USER = process.env.ADMIN_USER || 'hradmin@smegphilippines.com';
    const ADMIN_PASS = process.env.ADMIN_PASS || 'hradminpassword';

    console.log('Expected ADMIN_USER:', ADMIN_USER);
    console.log('ADMIN_USER from env:', process.env.ADMIN_USER);
    console.log('ADMIN_PASS from env exists:', !!process.env.ADMIN_PASS);
    console.log('Username match:', trimmedUsername === ADMIN_USER);
    console.log('Password match:', trimmedPassword === ADMIN_PASS);
    console.log('=== END DEBUG ===');

    if (trimmedUsername !== ADMIN_USER || trimmedPassword !== ADMIN_PASS) {
        console.warn('Authentication failed: Invalid credentials.');
        console.warn('Username comparison:', `"${trimmedUsername}" !== "${ADMIN_USER}"`);
        console.warn('Password comparison:', `"${trimmedPassword}" !== "${ADMIN_PASS}"`);
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Unauthorized: Invalid username or password.' }),
        };
    }
    console.log('Authentication successful.');

    try {
        // --- Database Connection and Data Fetching ---
        let applications = [];

        // PostgreSQL connection to fetch real application data
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL, // Your PostgreSQL connection string from Netlify env
            ssl: {
                rejectUnauthorized: false // Required for some PostgreSQL setups on Netlify/Heroku
            }
        });

        console.log('Attempting to connect to database and fetch data...');
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM applications ORDER BY submission_timestamp DESC');
            applications = result.rows;
            console.log(`Fetched ${applications.length} applications from database.`);
        } finally {
            client.release();
            console.log('Database client released.');
        }

        // Now using real database data only
        console.log(`Ready to generate Excel with ${applications.length} real applications.`);

        // --- Excel File Generation using ExcelJS ---
        console.log('Starting Excel file generation...');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('HR Applications');

        // Define columns - complete list for all form fields
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 8 },
            // Personal Information
            { header: 'Full Name', key: 'full_name', width: 25 },
            { header: 'Nick Name', key: 'nick_name', width: 15 },
            { header: 'Mobile No.', key: 'mobile_no', width: 15 },
            { header: 'Email Address', key: 'email_add', width: 30 },
            { header: 'Birth Date', key: 'birth_date', width: 12 },
            { header: 'Civil Status', key: 'civil_status', width: 12 },
            { header: 'Age', key: 'age', width: 8 },
            { header: 'Birth Place', key: 'birth_place', width: 20 },
            { header: 'Nationality', key: 'nationality', width: 15 },
            { header: 'Religion', key: 'religion', width: 15 },
            // Government IDs
            { header: 'SSS No.', key: 'sss_no', width: 15 },
            { header: 'PhilHealth No.', key: 'philhealth_no', width: 15 },
            { header: 'HDMF No.', key: 'hdmf_no', width: 15 },
            { header: 'National ID No.', key: 'national_id_no', width: 20 },
            { header: 'Driver\'s License', key: 'drivers_license', width: 20 },
            { header: 'TIN No.', key: 'tin_no', width: 15 },
            // Address
            { header: 'Current Address', key: 'current_address', width: 40 },
            { header: 'Provincial Address', key: 'provincial_address', width: 40 },
            // Family Background
            { header: 'Father\'s Name', key: 'father_name', width: 25 },
            { header: 'Father\'s Occupation', key: 'father_occupation', width: 20 },
            { header: 'Father\'s Age', key: 'father_age', width: 8 },
            { header: 'Father\'s Contact', key: 'father_contact_no', width: 15 },
            { header: 'Mother\'s Name', key: 'mother_name', width: 25 },
            { header: 'Mother\'s Occupation', key: 'mother_occupation', width: 20 },
            { header: 'Mother\'s Age', key: 'mother_age', width: 8 },
            { header: 'Mother\'s Contact', key: 'mother_contact_no', width: 15 },
            // Employment History
            { header: 'Previous Company 1', key: 'prev_company_1', width: 25 },
            { header: 'Position 1', key: 'position_1', width: 20 },
            { header: 'Dates Employed 1', key: 'dates_employed_1', width: 20 },
            { header: 'Reason for Leaving 1', key: 'reason_for_leaving_1', width: 30 },
            { header: 'Previous Company 2', key: 'prev_company_2', width: 25 },
            { header: 'Position 2', key: 'position_2', width: 20 },
            { header: 'Dates Employed 2', key: 'dates_employed_2', width: 20 },
            { header: 'Reason for Leaving 2', key: 'reason_for_leaving_2', width: 30 },
            // Competencies
            { header: 'Key Skills', key: 'key_skills', width: 40 },
            { header: 'Certifications', key: 'certifications', width: 30 },
            { header: 'Languages', key: 'languages', width: 20 },
            // References
            { header: 'Reference 1 Name', key: 'ref_1_name', width: 25 },
            { header: 'Reference 1 Relationship', key: 'ref_1_relationship', width: 20 },
            { header: 'Reference 1 Contact', key: 'ref_1_contact_no', width: 15 },
            { header: 'Reference 2 Name', key: 'ref_2_name', width: 25 },
            { header: 'Reference 2 Relationship', key: 'ref_2_relationship', width: 20 },
            { header: 'Reference 2 Contact', key: 'ref_2_contact_no', width: 15 },
            // Background Check
            { header: 'Past Employment Issues', key: 'past_employment_issues', width: 15 },
            { header: 'Past Employment Details', key: 'past_employment_issues_specify', width: 40 },
            { header: 'Legal Issues', key: 'legal_issues', width: 15 },
            { header: 'Legal Issues Details', key: 'legal_issues_specify', width: 40 },
            { header: 'Medical History', key: 'medical_history', width: 15 },
            { header: 'Medical History Details', key: 'medical_history_specify', width: 40 },
            // Additional
            { header: 'Referred By', key: 'referred_by', width: 25 },
            { header: 'Signature Name', key: 'signature_name', width: 25 },
            { header: 'Date Accomplished', key: 'date_accomplished', width: 15 },
            { header: 'Digital Agreement', key: 'digital_signature', width: 15 },
            { header: 'Profile Picture URL', key: 'profile_picture_url', width: 50 },
            { header: 'Submission Date', key: 'submission_timestamp', width: 20 }
        ];

        // Add rows from applications data
        worksheet.addRows(applications);
        console.log(`Added ${applications.length} rows to the Excel worksheet.`);

        // Generate the Excel buffer
        const excelBuffer = await workbook.xlsx.writeBuffer();
        console.log('Excel buffer generated successfully.');

        // --- Create ZIP file with Excel (signatures are now checkbox agreements) ---
        const zip = new JSZip();
        const dateStr = new Date().toISOString().slice(0, 10);
        
        // Add Excel file to ZIP
        zip.file(`HR_Applications_Data_${dateStr}.xlsx`, excelBuffer);
        
        // Digital signatures are now checkbox agreements, no separate files needed
        console.log('Digital signatures are now checkbox agreements - included in Excel data.');
        
        // Generate ZIP buffer
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        console.log('ZIP file generated successfully.');

        // --- Return ZIP file as response ---
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=HR_Applications_Complete_${dateStr}.zip`,
                'Content-Length': zipBuffer.length.toString(),
            },
            body: zipBuffer.toString('base64'),
            isBase64Encoded: true,
        };

    } catch (error) {
        console.error('Error in download-data function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                message: 'Failed to generate or download data. Please check function logs.', 
                error: error.message 
            }),
        };
    }
};