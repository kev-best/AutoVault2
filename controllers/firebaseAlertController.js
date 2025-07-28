const { db } = require('../firebase-admin');
const { sendSms } = require('../utils/twilioClient');
const { getIo } = require('../utils/socket');

// Send alert to user (admin/manager only)
exports.sendAlert = async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }
    
    // Get user details
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Create alert record
    const alertData = {
      userId,
      message,
      sentBy: req.user.uid,
      sentAt: new Date(),
      read: false
    };
    
    const alertRef = await db.collection('alerts').add(alertData);
    
    // Send SMS if user has phone number
    if (userData.phone) {
      try {
        await sendSms(userData.phone, message);
        alertData.smsSent = true;
      } catch (smsError) {
        console.error('Failed to send SMS:', smsError);
        alertData.smsSent = false;
        alertData.smsError = smsError.message;
      }
    }
    
    // Update alert with SMS status
    await alertRef.update({ 
      smsSent: alertData.smsSent || false,
      smsError: alertData.smsError || null
    });
    
    // Send real-time notification via Socket.IO
    try {
      const io = getIo();
      io.emit('newAlert', {
        id: alertRef.id,
        ...alertData,
        userEmail: userData.email
      });
    } catch (socketError) {
      console.error('Failed to send socket notification:', socketError);
    }
    
    res.status(201).json({
      id: alertRef.id,
      ...alertData,
      message: 'Alert sent successfully'
    });
    
  } catch (error) {
    console.error('Error sending alert:', error);
    res.status(500).json({ error: 'Failed to send alert' });
  }
};

// Get alerts for a user
exports.getUserAlerts = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const snapshot = await db.collection('alerts')
      .where('userId', '==', userId)
      .orderBy('sentAt', 'desc')
      .limit(50)
      .get();
    
    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt.toDate()
    }));
    
    res.json(alerts);
  } catch (error) {
    console.error('Error getting user alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

// Mark alert as read
exports.markAlertAsRead = async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.user.uid;
    
    // Verify alert belongs to user
    const alertDoc = await db.collection('alerts').doc(alertId).get();
    
    if (!alertDoc.exists) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    if (alertDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await alertDoc.ref.update({ read: true, readAt: new Date() });
    
    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
};

// Get all alerts (admin only)
exports.getAllAlerts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const snapshot = await db.collection('alerts')
      .orderBy('sentAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();
    
    const alerts = [];
    
    for (const doc of snapshot.docs) {
      const alertData = doc.data();
      
      // Get user details
      const userDoc = await db.collection('users').doc(alertData.userId).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      
      alerts.push({
        id: doc.id,
        ...alertData,
        sentAt: alertData.sentAt.toDate(),
        user: userData ? {
          email: userData.email,
          name: userData.name || 'N/A'
        } : null
      });
    }
    
    // Get total count
    const totalSnapshot = await db.collection('alerts').get();
    const total = totalSnapshot.size;
    
    res.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting all alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};
