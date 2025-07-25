// netlify/functions/download-data.js
const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs'); // Import ExcelJS
// const { Pool } = require('pg'); // Uncomment this line if you are using PostgreSQL

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS for all origins (for development, restrict in production)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // IMPORTANT: Replace * with your Netlify domain in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Define the API endpoint for downloading data
app.post('/.netlify/functions/download-data', async (req, res) => {
    console.log('--- download-data function invoked! ---');
    const { username, password } = req.body;

    // --- Admin Authentication (IMPORTANT: Use environment variables in production) ---
    // In a real application, fetch these securely from Netlify environment variables
    // For local testing, you might temporarily hardcode or use a .env file with netlify-cli
    const ADMIN_USER = process.env.ADMIN_USER || 'admin@example.com'; // Replace with your actual admin username
    const ADMIN_PASS = process.env.ADMIN_PASS || 'adminpassword123'; // Replace with your actual admin password

    console.log('Received username:', username);
    console.log('Attempting authentication...');

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
        console.warn('Authentication failed: Invalid credentials.');
        return res.status(401).json({ message: 'Unauthorized: Invalid username or password.' });
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
            const result = await client.query('SELECT * FROM applications ORDER BY submission_date DESC'); // Replace 'applications' with your table name
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
                    fullName: 'John Doe',
                    emailAdd: 'john.doe@example.com',
                    mobileNo: '09171234567',
                    birthDate: '1990-05-15',
                    currentAddress: '123 Main St, City, Country',
                    pastEmploymentIssues: 'no',
                    legalIssues: 'no',
                    medicalHistory: 'yes',
                    medicalHistorySpecify: 'Appendectomy in 2010',
                    signatureName: 'John Doe',
                    dateAccomplished: '2024-07-25',
                    profilePictureName: 'john_doe_pic.jpg',
                    digitalSignature: 'base64_signature_data_here_for_john',
                    submission_date: new Date().toISOString()
                },
                {
                    id: 2,
                    fullName: 'Jane Smith',
                    emailAdd: 'jane.smith@example.com',
                    mobileNo: '09187654321',
                    birthDate: '1992-11-20',
                    currentAddress: '456 Oak Ave, Town, Country',
                    pastEmploymentIssues: 'yes',
                    pastEmploymentIssuesSpecify: 'Resigned due to company restructuring',
                    legalIssues: 'no',
                    medicalHistory: 'no',
                    signatureName: 'Jane Smith',
                    dateAccomplished: '2024-07-24',
                    profilePictureName: 'jane_smith_pic.png',
                    digitalSignature: 'base64_signature_data_here_for_jane',
                    submission_date: new Date().toISOString()
                }
            ];
        }
        // --- End Mock Data ---

        // --- Excel File Generation using ExcelJS ---
        console.log('Starting Excel file generation...');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('HR Applications');

        // Define columns - this is crucial for ExcelJS to map data correctly
        // You should define all columns that you expect from your database or mock data
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 5 },
            { header: 'Full Name', key: 'fullName', width: 25 },
            { header: 'Email Address', key: 'emailAdd', width: 30 },
            { header: 'Mobile No.', key: 'mobileNo', width: 20 },
            { header: 'Birth Date', key: 'birthDate', width: 15 },
            { header: 'Current Address', key: 'currentAddress', width: 40 },
            { header: 'Past Employment Issues', key: 'pastEmploymentIssues', width: 25 },
            { header: 'Past Employment Issues Specify', key: 'pastEmploymentIssuesSpecify', width: 40 },
            { header: 'Legal Issues', key: 'legalIssues', width: 15 },
            { header: 'Legal Issues Specify', key: 'legalIssuesSpecify', width: 40 },
            { header: 'Medical History', key: 'medicalHistory', width: 20 },
            { header: 'Medical History Specify', key: 'medicalHistorySpecify', width: 40 },
            { header: 'Signature Name', key: 'signatureName', width: 25 },
            { header: 'Date Accomplished', key: 'dateAccomplished', width: 20 },
            { header: 'Profile Picture Name', key: 'profilePictureName', width: 30 },
            { header: 'Digital Signature (Base64)', key: 'digitalSignature', width: 60 }, // Note: Base64 can be very long
            { header: 'Submission Date', key: 'submission_date', width: 25 }
        ];

        // Add rows from applications data
        worksheet.addRows(applications);
        console.log(`Added ${applications.length} rows to the Excel worksheet.`);

        // Generate the Excel buffer
        const buffer = await workbook.xlsx.writeBuffer();
        console.log('Excel buffer generated successfully.');

        // --- Set Headers for File Download ---
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=HR_Applications_All_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
        res.setHeader('Content-Length', buffer.length); // Important for some browsers

        // Send the buffer as the response
        res.send(buffer);
        console.log('Excel file sent as response.');

    } catch (error) {
        console.error('Error in download-data function:', error);
        // Provide a more specific error message to the client if possible
        res.status(500).json({ message: 'Failed to generate or download data. Please check function logs.', error: error.message });
    }
});

// Export the handler for Netlify
exports.handler = serverless(app);
