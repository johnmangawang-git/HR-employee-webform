// Native Netlify function to get applicants list for admin print functionality
const { Pool } = require('pg');

// Initialize PostgreSQL Pool for Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

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

    try {
        const { username, password } = JSON.parse(event.body);

        // Verify admin credentials (same as download-data function)
        const adminUser = process.env.ADMIN_USER || 'hradmin@smegphilippines.com';
        const adminPass = process.env.ADMIN_PASS || 'hradminpassword';

        if (username !== adminUser || password !== adminPass) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Invalid credentials' }),
            };
        }

        // Get all applicants from database
        const query = `
            SELECT id, full_name, email_add, mobile_no, birth_date, current_address,
                   signature_name, date_accomplished, digital_signature, 
                   profile_picture_url, submission_timestamp
            FROM applications 
            ORDER BY submission_timestamp DESC
        `;

        const result = await pool.query(query);
        
        console.log(`Retrieved ${result.rows.length} applicants for admin print functionality`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result.rows),
        };

    } catch (error) {
        console.error('Error retrieving applicants:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Error retrieving applicants data' }),
        };
    }
};