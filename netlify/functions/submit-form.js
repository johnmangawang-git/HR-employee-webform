// netlify/functions/submit-form.js
const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');

const app = express();

// Use body-parser to parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS for all origins (for development, restrict in production)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Replace * with your Netlify domain in production
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Define the API endpoint for form submission
app.post('/.netlify/functions/submit-form', async (req, res) => {
  const formData = req.body;

  if (!formData) {
    return res.status(400).json({ message: 'No form data provided.' });
  }

  console.log('Received Form Data:', formData);

  // --- Placeholder for Database Integration ---
  // Here, you would implement logic to save `formData` to your database (e.g., PostgreSQL, MySQL).
  // Example (pseudo-code):
  /*
  try {
    const dbClient = await connectToDatabase(); // Your database connection function
    const result = await dbClient.query('INSERT INTO applications (data) VALUES ($1)', [JSON.stringify(formData)]);
    console.log('Data saved to database:', result);
    return res.status(200).json({ message: 'Form submitted successfully!', dataId: result.insertId });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ message: 'Error saving form data.', error: error.message });
  }
  */
  // ---------------------------------------------

  // For now, just send a success response
  res.status(200).json({ message: 'Form submitted successfully (data logged on serverless function).' });
});

// Export the handler for Netlify
exports.handler = serverless(app);