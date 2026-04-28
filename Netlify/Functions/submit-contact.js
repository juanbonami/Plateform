// netlify/functions/submit-contact.js
// Proxies form submissions to Brevo — keeps API key server-side only

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  // Check env variable is loaded
  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY is not set');
    return { statusCode: 500, headers, body: JSON.stringify({ message: 'Server config error — contact site owner' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid JSON' }) };
  }

  const {
    email, firstName, lastName,
    bizName, bizType, tagline,
    city, phone, vibe, services,
  } = body;

  if (!email || !firstName) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Email and name are required' }),
    };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        // API key lives ONLY here, as a Netlify env variable
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        firstName,
        lastName,
        attributes: {
          FIRSTNAME: firstName,
          LASTNAME: lastName,
          BIZ_NAME: bizName,
          BIZ_TYPE: bizType,
          TAGLINE: tagline,
          CITY: city,
          PHONE: phone,
          VIBE: vibe,
          SERVICES: services,
          SOURCE: 'Website Preview Form',
        },
        listIds: [2],
        updateEnabled: true,
      }),
    });

    if (res.ok || res.status === 201 || res.status === 204) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    const error = await res.json();
    console.error('Brevo error:', error);
    return {
      statusCode: res.status,
      headers,
      body: JSON.stringify({ message: error.message || 'Brevo error' }),
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Server error — please try again' }),
    };
  }
};
