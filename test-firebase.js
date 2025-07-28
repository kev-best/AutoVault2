// Firebase connection test script
const admin = require('firebase-admin');

async function testFirebaseConnection() {
  console.log('🔍 Testing Firebase Admin SDK connection...\n');

  try {
    // Load service account
    const serviceAccount = require('./serviceAccountKey.json');
    console.log('✅ Service account loaded successfully');
    console.log('   Project ID:', serviceAccount.project_id);
    console.log('   Client Email:', serviceAccount.client_email);

    // Initialize Firebase Admin
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('✅ Firebase Admin SDK initialized');
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // Test Firestore read access
    console.log('\n🔍 Testing Firestore read access...');
    try {
      const testDoc = await db.collection('_test').limit(1).get();
      console.log('✅ Firestore read access: OK');
    } catch (firestoreError) {
      console.error('❌ Firestore read access failed:', firestoreError.message);
      if (firestoreError.code === 16) {
        console.error('🔧 This is an authentication/permission error');
      }
    }

    // Test Firestore write access
    console.log('\n🔍 Testing Firestore write access...');
    try {
      await db.collection('_test').doc('connection-test').set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        test: true
      });
      console.log('✅ Firestore write access: OK');
      
      // Clean up test document
      await db.collection('_test').doc('connection-test').delete();
      console.log('✅ Test cleanup completed');
    } catch (writeError) {
      console.error('❌ Firestore write access failed:', writeError.message);
    }

    // Test Firebase Auth access
    console.log('\n🔍 Testing Firebase Auth access...');
    try {
      await auth.listUsers(1);
      console.log('✅ Firebase Auth access: OK');
    } catch (authError) {
      console.error('❌ Firebase Auth access failed:', authError.message);
    }

    console.log('\n🎉 Firebase connection test completed!');

  } catch (error) {
    console.error('❌ Critical error during testing:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Verify serviceAccountKey.json exists and is valid');
    console.error('2. Check that the service account has the required permissions:');
    console.error('   - Cloud Datastore User (for Firestore)');
    console.error('   - Firebase Authentication Admin');
    console.error('3. Ensure the project ID matches in both frontend and backend');
    console.error('4. Try downloading a fresh service account key from Firebase Console');
  }

  process.exit(0);
}

testFirebaseConnection();
