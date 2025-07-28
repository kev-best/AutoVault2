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

// Get dealerships for a car from MarketCheck data
exports.getCarDealerships = async (req, res) => {
  try {
    const { vin } = req.params;
    const radius = parseInt(req.query.radius) || 50; // miles
    
    console.log(`Fetching dealerships for VIN: ${vin}`);
    
    // Get the specific car to determine make/model for finding similar dealers
    const carSnapshot = await db.collection('cars').where('vin', '==', vin).limit(1).get();
    
    if (carSnapshot.empty) {
      console.log(`Car with VIN ${vin} not found`);
      return res.status(404).json({ error: 'Car not found' });
    }
    
    const targetCar = carSnapshot.docs[0].data();
    console.log('Target car dealer:', JSON.stringify(targetCar.dealer, null, 2));
    
    if (!targetCar.dealer) {
      return res.status(400).json({ error: 'No dealer information available for this car' });
    }
    
    // Get all cars from the same make to find different dealerships
    const allCarsSnapshot = await db.collection('cars')
      .where('make', '==', targetCar.make)
      .get();
    
    // Extract unique dealerships with valid data
    const dealershipMap = new Map();
    
    allCarsSnapshot.docs.forEach(doc => {
      const car = doc.data();
      if (car.dealer && car.dealer.name && car.dealer.lat && car.dealer.lng) {
        const dealerKey = `${car.dealer.name}_${car.dealer.city}_${car.dealer.state}`;
        
        if (!dealershipMap.has(dealerKey)) {
          dealershipMap.set(dealerKey, {
            id: car.dealer.id,
            name: car.dealer.name || 'Unknown Dealership',
            address: car.dealer.street ? 
              `${car.dealer.street}, ${car.dealer.city || 'Unknown City'}, ${car.dealer.state || 'Unknown State'} ${car.dealer.zip || ''}`.trim() :
              `${car.dealer.city || 'Unknown City'}, ${car.dealer.state || 'Unknown State'}`,
            street: car.dealer.street || '',
            city: car.dealer.city || 'Unknown City',
            state: car.dealer.state || 'Unknown State',
            zip: car.dealer.zip || '',
            country: car.dealer.country || 'US',
            lat: parseFloat(car.dealer.lat),
            lng: parseFloat(car.dealer.lng),
            phone: car.dealer.phone || 'Phone not available',
            website: car.dealer.website || null,
            dealerType: car.dealer.dealerType || 'Unknown',
            // Add the original car's dealer as the first/primary one
            isPrimary: car.vin === vin
          });
        }
      }
    });
    
    let dealerships = Array.from(dealershipMap.values());
    
    // Sort to put the primary dealer first, then by name
    dealerships.sort((a, b) => {
      if (a.isPrimary) return -1;
      if (b.isPrimary) return 1;
      return a.name.localeCompare(b.name);
    });
    
    // Limit to reasonable number of results
    dealerships = dealerships.slice(0, 10);
    
    console.log(`Found ${dealerships.length} unique dealerships for ${targetCar.make}`);
    res.json(dealerships);
  } catch (error) {
    console.error('Error getting car dealerships:', error);
    res.status(500).json({ error: 'Failed to fetch dealerships', details: error.message });
  }
};
