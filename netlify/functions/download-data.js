// Native Netlify function for data download (without Express)
const ExcelJS = require('exceljs'); // Import ExcelJS
const JSZip = require('jszip'); // For creating ZIP files with multiple files
// const { Pool } = require('pg'); // Uncomment this line if you are using PostgreSQL

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
        // Uncomment and configure this section for actual database interaction
        let applications = [];

        // Example PostgreSQL connection (requires 'pg' package installed in netlify/functions)
        /*
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL, // Your PostgreSQL connection string from Netlify env
            ssl: {
                rejectUnauthorized: false // Required for some PostgreSQL setups on Netlify/Heroku
            }
        });

        console.log('Attempting to connect to database and fetch data...');
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM applications ORDER BY submission_timestamp DESC'); // Replace 'applications' with your table name
            applications = result.rows;
            console.log(`Fetched ${applications.length} applications from database.`);
        } finally {
            client.release();
            console.log('Database client released.');
        }
        */

        // --- Mock Data for Testing (Remove or comment out when using actual database) ---
        if (applications.length === 0) {
            console.log('Using mock data as no database data was fetched.');
            applications = [
                {
                    id: 1,
                    full_name: 'John Doe',
                    email_add: 'john.doe@example.com',
                    mobile_no: '09171234567',
                    birth_date: '1990-05-15',
                    current_address: '123 Main St, City, Country',
                    past_employment_issues: 'no',
                    legal_issues: 'no',
                    medical_history: 'yes',
                    medical_history_specify: 'Appendectomy in 2010',
                    signature_name: 'John Doe',
                    date_accomplished: '2024-07-25',
                    profile_picture_name: 'john_doe_pic.jpg',
                    digital_signature: 'agreed',
                    submission_timestamp: new Date().toISOString()
                },
                {
                    id: 2,
                    full_name: 'Jane Smith',
                    email_add: 'jane.smith@example.com',
                    mobile_no: '09187654321',
                    birth_date: '1992-11-20',
                    current_address: '456 Oak Ave, Town, Country',
                    past_employment_issues: 'yes',
                    past_employment_issues_specify: 'Resigned due to company restructuring',
                    legal_issues: 'no',
                    medical_history: 'no',
                    signature_name: 'Jane Smith',
                    date_accomplished: '2024-07-24',
                    profile_picture_name: 'jane_smith_pic.png',
                    digital_signature: 'agreed',
                    submission_timestamp: new Date().toISOString()
                }
            ];
        }
        // --- End Mock Data ---

        // --- Excel File Generation using ExcelJS ---
        console.log('Starting Excel file generation...');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('HR Applications');

        // Define columns - this is crucial for ExcelJS to map data correctly
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 5 },
            { header: 'Full Name', key: 'full_name', width: 25 },
            { header: 'Email Address', key: 'email_add', width: 30 },
            { header: 'Mobile No.', key: 'mobile_no', width: 20 },
            { header: 'Birth Date', key: 'birth_date', width: 15 },
            { header: 'Current Address', key: 'current_address', width: 40 },
            { header: 'Past Employment Issues', key: 'past_employment_issues', width: 25 },
            { header: 'Past Employment Issues Specify', key: 'past_employment_issues_specify', width: 40 },
            { header: 'Legal Issues', key: 'legal_issues', width: 15 },
            { header: 'Legal Issues Specify', key: 'legal_issues_specify', width: 40 },
            { header: 'Medical History', key: 'medical_history', width: 20 },
            { header: 'Medical History Specify', key: 'medical_history_specify', width: 40 },
            { header: 'Signature Name', key: 'signature_name', width: 25 },
            { header: 'Date Accomplished', key: 'date_accomplished', width: 20 },
            { header: 'Profile Picture Name', key: 'profile_picture_name', width: 30 },
            { header: 'Digital Signature Agreement', key: 'digital_signature', width: 30 },
            { header: 'Submission Date', key: 'submission_timestamp', width: 25 }
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