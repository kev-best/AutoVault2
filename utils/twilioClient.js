const twilio = require('twilio');

// Initialize Twilio client with error handling for missing credentials
let client = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('✅ Twilio client initialized successfully');
  } else {
    console.warn('⚠️ Twilio credentials not configured - SMS functionality will be disabled');
  }
} catch (error) {
  console.error('❌ Failed to initialize Twilio client:', error.message);
  console.warn('⚠️ SMS functionality will be disabled');
}

async function sendSms(to, body) {
  try {
    if (!client) {
      console.warn('Twilio client not available - SMS not sent');
      return {
        success: false,
        error: 'SMS service not configured',
        to: to
      };
    }

    // Validate input parameters
    if (!to || !body) {
      throw new Error('Phone number and message body are required');
    }

    // Ensure phone number is in E.164 format (e.g., +1234567890)
    const formattedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;

    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedTo
    });

    console.log(`SMS sent successfully to ${formattedTo}. SID: ${message.sid}`);
    return {
      success: true,
      messageId: message.sid,
      to: formattedTo,
      status: message.status
    };
  } catch (error) {
    console.error('Failed to send SMS:', error.message);
    return {
      success: false,
      error: error.message,
      to: to
    };
  }
}

// Function to send SMS alerts to multiple users
async function sendBulkSms(phoneNumbers, body) {
  try {
    if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      throw new Error('Phone numbers array is required and cannot be empty');
    }

    const results = await Promise.allSettled(
      phoneNumbers.map(phoneNumber => sendSms(phoneNumber, body))
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    console.log(`Bulk SMS completed: ${successful} successful, ${failed} failed`);
    
    return {
      success: true,
      total: results.length,
      successful,
      failed,
      results: results.map((result, index) => ({
        phoneNumber: phoneNumbers[index],
        success: result.status === 'fulfilled' && result.value.success,
        messageId: result.status === 'fulfilled' ? result.value.messageId : null,
        error: result.status === 'rejected' ? result.reason.message : 
               (result.value.success ? null : result.value.error)
      }))
    };
  } catch (error) {
    console.error('Failed to send bulk SMS:', error.message);
    return {
      success: false,
      error: error.message,
      total: phoneNumbers ? phoneNumbers.length : 0,
      successful: 0,
      failed: phoneNumbers ? phoneNumbers.length : 0
    };
  }
}

// Function to validate Twilio configuration
function validateTwilioConfig() {
  if (!client) {
    return { valid: false, error: 'Twilio client not initialized' };
  }

  const requiredEnvVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    return { 
      valid: false, 
      error: `Missing required Twilio environment variables: ${missing.join(', ')}` 
    };
  }

  return { valid: true };
}

module.exports = { 
  sendSms, 
  sendBulkSms, 
  validateTwilioConfig 
};