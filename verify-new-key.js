// Quick Firebase verification script
// Run this after replacing serviceAccountKey.json

const admin = require('firebase-admin');

async function quickTest() {
  try {
    console.log('🔍 Testing new service account key...');
    
    const serviceAccount = require('./serviceAccountKey.json');
    console.log('✅ Key loaded:', serviceAccount.client_email);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    
    const db = admin.firestore();
    
    // Simple read test
    await db.collection('_test').limit(1).get();
    console.log('✅ SUCCESS! Firestore access working');
    
    // Test auth
    await admin.auth().listUsers(1);
    console.log('✅ SUCCESS! Firebase Auth access working');
    
    console.log('\n🎉 Your new service account key is working perfectly!');
    console.log('You can now restart your server.');
    
  } catch (error) {
    console.error('❌ Still having issues:', error.message);
  }
  
  process.exit(0);
}

quickTest();
