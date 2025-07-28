const admin = require('firebase-admin');

let app;
try {
  // Check if already initialized
  if (admin.apps.length === 0) {
    let serviceAccount;
    
    // Try to use environment variables first (for production)
    if (process.env.FIREBASE_PRIVATE_KEY) {
      console.log('🔑 Using Firebase credentials from environment variables');
      serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        universe_domain: "googleapis.com"
      };
    } else {
      // Fall back to local file for development
      console.log('🔑 Using local service account file for development');
      serviceAccount = require('./serviceAccountKey.json');
    }
    
    console.log('🔑 Loading service account for project:', serviceAccount.project_id);
    
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    app = admin.apps[0];
    console.log('✅ Using existing Firebase Admin SDK instance');
  }
} catch (err) {
  console.error('❌ Firebase Admin initialization error:', err.message);
  console.warn('🔄 Falling back to basic configuration...');
  
  try {
    app = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'autovault-449'
    });
    console.log('⚠️ Firebase Admin initialized with fallback configuration');
  } catch (fallbackErr) {
    console.error('❌ Fallback initialization also failed:', fallbackErr.message);
    throw new Error('Failed to initialize Firebase Admin SDK');
  }
}

const db = admin.firestore();
const auth = admin.auth();

// Test the connection
async function testConnection() {
  try {
    await db.collection('_health').limit(1).get();
    console.log('✅ Firestore connection test passed');
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error.message);
    if (error.code === 16) {
      console.error('🔧 Authentication issue detected. Please check:');
      console.error('   1. Service account key is valid');
      console.error('   2. Service account has Firestore permissions');
      console.error('   3. Project ID matches in both frontend and backend');
    }
  }
}

// Run connection test after a short delay
setTimeout(testConnection, 1000);

module.exports = { admin, db, auth };