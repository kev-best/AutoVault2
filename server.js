const express = require('express');
const cors = require('cors');
const { db, auth } = require('./firebase-admin');
const { init: initSocket } = require('./utils/socket');
const carController = require('./controllers/firebaseCarController');
const alertController = require('./controllers/firebaseAlertController');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Middleware to verify Firebase ID token and attach user
async function verifyFirebaseToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const idToken = header.split(' ')[1];
  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email };
    
    // Fetch user role from Firebase
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    req.user.role = userDoc.exists ? userDoc.data().role : 'user';
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ error: 'Unauthorized' });
  }
}

// Middleware to check admin/manager role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Admin or manager role required' });
  }
  next();
}

// ==================== AUTH ROUTES ====================

// Verify token endpoint
app.post('/api/auth/verify-token', verifyFirebaseToken, async (req, res) => {
  res.json({ user: req.user });
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { idToken, role, name, phone } = req.body;
    
    const decoded = await auth.verifyIdToken(idToken);
    
    const userData = {
      uid: decoded.uid,
      email: decoded.email,
      name: name || decoded.name || '',
      phone: phone || '',
      role: role || 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('users').doc(decoded.uid).set(userData);
    
    res.json({ message: 'User registered successfully', user: userData });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get user profile
app.get('/api/auth/profile', verifyFirebaseToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    res.json({ user: { id: userDoc.id, ...userDoc.data() } });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ==================== CAR ROUTES ====================

// Get random cars for users (Feature 5)
app.get('/api/cars/random', verifyFirebaseToken, carController.getRandomCars);

// Get car by VIN
app.get('/api/cars/vin/:vin', verifyFirebaseToken, carController.getCarByVin);

// Get dealerships for a car (Feature 6)
app.get('/api/cars/:vin/dealerships', verifyFirebaseToken, carController.getCarDealerships);

// Admin-only car management (Feature 3)
app.get('/api/cars', verifyFirebaseToken, requireAdmin, carController.getAllCars);
app.post('/api/cars', verifyFirebaseToken, requireAdmin, carController.addCar);
app.put('/api/cars/:id', verifyFirebaseToken, requireAdmin, carController.updateCar);
app.delete('/api/cars/:id', verifyFirebaseToken, requireAdmin, carController.deleteCar);

// ==================== ALERT ROUTES ====================

// Send alert to user (Feature 4 - Admin only)
app.post('/api/alerts', verifyFirebaseToken, requireAdmin, alertController.sendAlert);

// Get user's alerts
app.get('/api/alerts', verifyFirebaseToken, alertController.getUserAlerts);

// Mark alert as read
app.put('/api/alerts/:alertId/read', verifyFirebaseToken, alertController.markAlertAsRead);

// Get all alerts (admin only)
app.get('/api/alerts/all', verifyFirebaseToken, requireAdmin, alertController.getAllAlerts);

// ==================== USER ROUTES ====================

// Get all users for admin (for sending alerts)
app.get('/api/users', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
      password: undefined // Don't send password field
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚗 AutoVault server running on port ${PORT}`);
  console.log(`📱 Socket.IO enabled for real-time alerts`);
  console.log(`🔥 Firebase Admin SDK initialized`);
});