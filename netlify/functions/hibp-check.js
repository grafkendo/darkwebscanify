const axios = require('axios');

// HIBP API configuration
const HIBP_API_URL = 'https://haveibeenpwned.com/api/v3';
const HIBP_API_KEY = process.env.HIBP_API_KEY; // Set this in Netlify environment variables

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': 'https://darkscantest.design.webflow.com',
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
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse the request body to get the email
    const requestBody = JSON.parse(event.body);
    const email = requestBody.email;

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // Call the HIBP API to check for breaches
    const breaches = await checkBreaches(email);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(breaches)
    };
  } catch (error) {
    console.error('Error checking breaches:', error);
    
    // Return appropriate error response
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error checking for breaches',
        message: error.message
      })
    };
  }
};

/**
 * Check if an email has been involved in any breaches
 * @param {string} email - The email to check
 * @returns {Promise<Array>} - Array of breaches or empty array
 */
async function checkBreaches(email) {
  try {
    // Make request to HIBP API
    const response = await axios({
      method: 'GET',
      url: `${HIBP_API_URL}/breachedaccount/${encodeURIComponent(email)}`,
      headers: {
        'hibp-api-key': HIBP_API_KEY,
        'User-Agent': 'DarkWebScanTool'
      },
      params: {
        truncateResponse: false
      }
    });
    
    // If we get here, we have breach data
    return response.data;
  } catch (error) {
    // If 404, it means no breaches were found (which is good)
    if (error.response && error.response.status === 404) {
      return []; // Return empty array for no breaches
    }
    
    // For rate limiting or other API issues
    if (error.response) {
      const statusCode = error.response.status;
      let message = 'Error checking breach data';
      
      if (statusCode === 429) {
        message = 'Rate limit exceeded. Please try again later.';
      } else if (statusCode === 401) {
        message = 'API authentication failed. Please check API key configuration.';
      }
      
      const customError = new Error(message);
      customError.statusCode = statusCode;
      throw customError;
    }
    
    // For network errors or other issues
    throw new Error('Error connecting to breach database: ' + error.message);
  }
}