// Test script to verify Firebase permissions after IAM update
const admin = require('firebase-admin');

async function testPermissions() {
  console.log('🔍 Testing Firebase permissions after IAM update...\n');

  try {
    const serviceAccount = require('./serviceAccountKey.json');
    console.log('✅ Service account loaded:', serviceAccount.client_email);

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // Test 1: Service Usage (this was failing before)
    console.log('🔍 Testing Service Usage permissions...');
    try {
      await auth.listUsers(1);
      console.log('✅ Service Usage: WORKING');
    } catch (error) {
      console.error('❌ Service Usage still failing:', error.message);
      return;
    }

    // Test 2: Firestore access
    console.log('🔍 Testing Firestore permissions...');
    try {
      await db.collection('test').limit(1).get();
      console.log('✅ Firestore: WORKING');
    } catch (error) {
      console.error('❌ Firestore still failing:', error.message);
    }

    // Test 3: Write a test document
    console.log('🔍 Testing Firestore write permissions...');
    try {
      await db.collection('_test').doc('permission-test').set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        test: 'permissions working'
      });
      console.log('✅ Firestore Write: WORKING');
      
      // Clean up
      await db.collection('_test').doc('permission-test').delete();
      console.log('✅ Test cleanup completed');
    } catch (error) {
      console.error('❌ Firestore write still failing:', error.message);
    }

    console.log('\n🎉 ALL TESTS PASSED! Your Firebase setup is now working correctly.');
    console.log('You can now restart your server and the authentication should work.');

  } catch (error) {
    console.error('❌ Critical error:', error.message);
    
    if (error.message.includes('serviceusage.serviceUsageConsumer')) {
      console.error('\n🔧 You still need to add the Service Usage Consumer role.');
      console.error('Go to: https://console.developers.google.com/iam-admin/iam/project?project=autovault-449');
    }
  }

  process.exit(0);
}

testPermissions();
