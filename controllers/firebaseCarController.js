const { db } = require('../firebase-admin');
const { searchVehicles } = require('../services/marketcheckService');
const { findDealerships } = require('../utils/googleMapsClient');

// Get random cars from Firebase for users
exports.getRandomCars = async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 3;
    const snapshot = await db.collection('cars').get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: 'No cars found in database' });
    }
    
    const allCars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const randomCars = [];
    
    // Get random cars
    const shuffled = [...allCars];
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const randomIndex = Math.floor(Math.random() * shuffled.length);
      randomCars.push(shuffled.splice(randomIndex, 1)[0]);
    }
    
    res.json(randomCars);
  } catch (error) {
    console.error('Error getting random cars:', error);
    res.status(500).json({ error: 'Failed to fetch random cars' });
  }
};

// Get all cars for admin (with pagination)
exports.getAllCars = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const snapshot = await db.collection('cars')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();
    
    const cars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get total count
    const totalSnapshot = await db.collection('cars').get();
    const total = totalSnapshot.size;
    
    res.json({
      cars,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting all cars:', error);
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
};

// Add car (admin only)
exports.addCar = async (req, res) => {
  try {
    const carData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('cars').add(carData);
    const newCar = { id: docRef.id, ...carData };
    
    res.status(201).json(newCar);
  } catch (error) {
    console.error('Error adding car:', error);
    res.status(500).json({ error: 'Failed to add car' });
  }
};

// Update car (admin only)
exports.updateCar = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    await db.collection('cars').doc(id).update(updateData);
    
    const updatedDoc = await db.collection('cars').doc(id).get();
    const updatedCar = { id: updatedDoc.id, ...updatedDoc.data() };
    
    res.json(updatedCar);
  } catch (error) {
    console.error('Error updating car:', error);
    res.status(500).json({ error: 'Failed to update car' });
  }
};

// Delete car (admin only)
exports.deleteCar = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('cars').doc(id).delete();
    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    console.error('Error deleting car:', error);
    res.status(500).json({ error: 'Failed to delete car' });
  }
};

// Get car by VIN
exports.getCarByVin = async (req, res) => {
  try {
    const { vin } = req.params;
    const snapshot = await db.collection('cars').where('vin', '==', vin).limit(1).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Car not found' });
    }
    
    const car = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    res.json(car);
  } catch (error) {
    console.error('Error getting car by VIN:', error);
    res.status(500).json({ error: 'Failed to fetch car' });
  }
};

// Get dealerships for a car
exports.getCarDealerships = async (req, res) => {
  try {
    const { vin } = req.params;
    const radius = parseInt(req.query.radius) || 10000;
    
    const snapshot = await db.collection('cars').where('vin', '==', vin).limit(1).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Car not found' });
    }
    
    const car = snapshot.docs[0].data();
    
    if (!car.dealer || !car.dealer.lat || !car.dealer.lng) {
      return res.status(400).json({ error: 'Car location not available' });
    }
    
    const dealerships = await findDealerships({
      lat: car.dealer.lat,
      lng: car.dealer.lng,
      radius
    });
    
    res.json(dealerships);
  } catch (error) {
    console.error('Error getting car dealerships:', error);
    res.status(500).json({ error: 'Failed to fetch dealerships' });
  }
};
