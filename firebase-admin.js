const admin = require('firebase-admin');

let app;
try {
  // Check if already initialized
  if (admin.apps.length === 0) {
    const serviceAccount = require('./serviceAccountKey.json');
    
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
  console.warn('🔄 Falling back to environment variables...');
  
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