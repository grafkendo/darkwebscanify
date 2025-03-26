// hibp-check.js
const axios = require('axios');

exports.handler = async function(event) {
  // Set CORS headers to allow requests from your Webflow site
  const headers = {
    'Access-Control-Allow-Origin': '*', // Replace with your Webflow domain in production
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    const email = requestBody.email;
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email address' })
      };
    }
    
    // Your HaveIBeenPwned API key (stored as environment variable)
    const apiKey = process.env.HIBP_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }
    
    // Call the HaveIBeenPwned API
    const response = await axios.get(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`, {
      headers: {
        'hibp-api-key': apiKey,
        'User-Agent': 'IdentityIQBreachChecker'
      }
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    // No breaches found returns 404
    if (error.response && error.response.status === 404) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };
    }
    
    console.error('HIBP API Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error checking for breaches',
        details: error.response ? `Status: ${error.response.status}` : error.message
      })
    };
  }
};