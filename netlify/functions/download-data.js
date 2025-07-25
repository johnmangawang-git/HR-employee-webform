// netlify/functions/download-data.js
const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');

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

// Define the API endpoint for downloading data
app.post('/.netlify/functions/download-data', async (req, res) => {
    console.log('--- download-data function invoked! ---'); // This is the key log!
    const { username, password } = req.body;

    // IMPORTANT DEBUGGING LOGS: Check these in your Netlify Function logs!
    console.log('Received username:', username);
    console.log('Received password (first 3 chars):', password ? password.substring(0, 3) + '...' : 'N/A'); // Log partially for security

    // For now, just send a success response to see if the function runs at all
    // We'll re-add the authentication and database logic once this basic test passes.
    return res.status(200).json({ message: 'Basic function test successful! Check logs.' });
});

// Export the handler for Netlify
exports.handler = serverless(app);