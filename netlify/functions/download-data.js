// netlify/functions/download-data.js
const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const { Pool } = require('pg'); // PostgreSQL client for Supabase
const ExcelJS = require('exceljs'); // For Excel file generation

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS for all origins (for development, restrict in production)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // IMPORTANT: Replace * with your Netlify domain in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Add Authorization header
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Initialize PostgreSQL Pool for Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Supabase connection string from Netlify Environment Variable
    ssl: {
        rejectUnauthorized: false
    }
});

// Function to generate Excel buffer from an array of data
async function generateExcelBuffer(data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('HR Application Data');

    if (data.length === 0) {
        worksheet.addRow(['No data available']);
        return await workbook.xlsx.writeBuffer();
    }

    // Get all unique keys from all objects to form headers
    const allKeys = new Set();
    data.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
    });

    const columns = Array.from(allKeys).map(key => ({
        header: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/_/g, ' '), // Convert camelCase/snake_case to Title Case
        key: key,
        width: 25
    }));
    worksheet.columns = columns;

    // Add data rows
    data.forEach(row => {
        worksheet.addRow(row);
    });

    // Auto-fit columns (optional)
    worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, function (cell) {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    return await workbook.xlsx.writeBuffer();
}

// Define the API endpoint for downloading data
app.post('/.netlify/functions/download-data', async (req, res) => {
    const { username, password } = req.body;

    // --- Admin Authentication ---
    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;

    // IMPORTANT DEBUGGING LOGS: Check these in your Netlify Function logs!
    console.log('Received username:', username);
    console.log('Received password (first 3 chars):', password ? password.substring(0, 3) + '...' : 'N/A'); // Log partially for security
    console.log('Expected ADMIN_USER (from env):', ADMIN_USER);
    console.log('Expected ADMIN_PASS (from env, first 3 chars):', ADMIN_PASS ? ADMIN_PASS.substring(0, 3) + '...' : 'N/A'); // Log partially for security

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
        console.warn('Unauthorized download attempt: Mismatch in credentials.');
        return res.status(401).json({ message: 'Authentication failed. Please check your credentials.' });
    }

    // --- Fetch All Data from Database ---
    try {
        const allApplications = await pool.query('SELECT * FROM applications ORDER BY submission_timestamp DESC;');
        const dataToExport = allApplications.rows;

        if (dataToExport.length === 0) {
            return res.status(404).json({ message: 'No application data found to export.' });
        }

        const excelBuffer = await generateExcelBuffer(dataToExport);

        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=HR_Applications_All_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
        res.send(excelBuffer);

        console.log('Admin data download successful.');

    } catch (error) {
        console.error('Error fetching or exporting data:', error);
        res.status(500).json({ message: 'Failed to retrieve or export data.', error: error.message });
    }
});

// Export the handler for Netlify
exports.handler = serverless(app);