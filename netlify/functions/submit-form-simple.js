// Simple Netlify function without Express to test if the issue is with serverless-http
exports.handler = async (event, context) => {
    console.log('=== SIMPLE FUNCTION DEBUG START ===');
    console.log('Event method:', event.httpMethod);
    console.log('Event headers:', event.headers);
    console.log('Event body type:', typeof event.body);
    console.log('Event body:', event.body);
    
    // Handle CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: '',
        };
    }
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }
    
    let formData;
    try {
        formData = JSON.parse(event.body);
        console.log('Parsed form data:', formData);
        console.log('Form data keys:', Object.keys(formData));
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: 'Invalid JSON' }),
        };
    }
    
    // Simple validation test
    if (formData.fullName && formData.emailAdd) {
        console.log('SUCCESS: Data received correctly!');
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: 'Success! Data received correctly.',
                receivedData: formData 
            }),
        };
    } else {
        console.log('FAILURE: Missing required fields');
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: 'Missing required fields',
                receivedData: formData 
            }),
        };
    }
};