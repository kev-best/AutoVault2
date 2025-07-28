const { db } = require('../firebase-admin');
const { searchVehicles } = require('../services/marketcheckService');
require('dotenv').config();

// Helper function to remove undefined values
function filterUndefined(obj) {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        cleaned[key] = filterUndefined(obj[key]);
      } else {
        cleaned[key] = obj[key];
      }
    }
  });
  return cleaned;
}

async function populateCarsFromMarketcheck() {
  try {
    console.log('Starting car population from Marketcheck API...');
    
    // Check if cars already exist
    const existingCars = await db.collection('cars').get();
    if (!existingCars.empty) {
      console.log(`Found ${existingCars.size} existing cars. Skipping population.`);
      console.log('To repopulate, delete existing cars first.');
      return;
    }
    
    // Search parameters for diverse car selection
    const searchParams = [
      { make: 'BMW', limit: 25 },
      { make: 'Mercedes-Benz', limit: 25 },
      { make: 'Toyota', limit: 25 },
      { make: 'Honda', limit: 25 },
      { make: 'Ford', limit: 25 },
      { make: 'Chevrolet', limit: 25 },
      { make: 'Audi', limit: 25 },
      { make: 'Lexus', limit: 25 }
    ];
    
    let totalCarsAdded = 0;
    const batch = db.batch();
    
    for (const params of searchParams) {
      try {
        console.log(`Fetching ${params.limit} ${params.make} vehicles...`);
        
        const vehicles = await searchVehicles({
          ...params,
          api_key: process.env.MARKETCHECK_API_KEY
        });
        
        console.log(`Found ${vehicles.length} ${params.make} vehicles`);
        
        // Add vehicles to batch
        for (const vehicle of vehicles.slice(0, params.limit)) {
          const carData = {
            // Basic info
            id: vehicle.id,
            vin: vehicle.vin,
            heading: vehicle.heading,
            year: vehicle.year,
            make: vehicle.make,
            model: vehicle.model,
            trim: vehicle.trim,
            version: vehicle.version,
            miles: vehicle.miles || 0,
            price: vehicle.price || 0,
            msrp: vehicle.msrp || vehicle.price || 0,
            vdpUrl: vehicle.vdpUrl,
            
            // Build details
            bodyType: vehicle.bodyType,
            vehicleType: vehicle.vehicleType,
            transmission: vehicle.transmission,
            drivetrain: vehicle.drivetrain,
            fuelType: vehicle.fuelType,
            engine: vehicle.engine,
            engineSize: vehicle.engineSize,
            doors: vehicle.doors,
            cylinders: vehicle.cylinders,
            cityMpg: vehicle.cityMpg,
            highwayMpg: vehicle.highwayMpg,
            seating: vehicle.seating,
            
            // Colors
            exteriorColor: vehicle.exteriorColor,
            interiorColor: vehicle.interiorColor,
            baseExtColor: vehicle.baseExtColor,
            baseIntColor: vehicle.baseIntColor,
            
            // Media - Use photo_links for better quality images
            media: vehicle.media?.photoLinks || [],
            mediaCached: vehicle.media?.photoCached || [],
            
            // Dealer info
            dealer: {
              id: vehicle.dealer?.id,
              name: vehicle.dealer?.name || 'Unknown Dealer',
              website: vehicle.dealer?.website,
              dealerType: vehicle.dealer?.dealerType,
              street: vehicle.dealer?.street,
              city: vehicle.dealer?.city,
              state: vehicle.dealer?.state,
              country: vehicle.dealer?.country,
              lat: vehicle.dealer?.lat || 0,
              lng: vehicle.dealer?.lng || 0,
              zip: vehicle.dealer?.zip,
              phone: vehicle.dealer?.phone
            },
            
            // Additional data
            inventoryType: vehicle.inventoryType,
            sellerType: vehicle.sellerType,
            stockNo: vehicle.stockNo,
            source: vehicle.source,
            dataSource: vehicle.dataSource,
            
            // Carfax
            carfaxOneOwner: vehicle.carfaxOneOwner,
            carfaxCleanTitle: vehicle.carfaxCleanTitle,
            
            // Timestamps
            lastSeenAt: vehicle.lastSeenAt,
            scrapedAt: vehicle.scrapedAt,
            firstSeenAt: vehicle.firstSeenAt,
            createdAt: new Date(),
            updatedAt: new Date(),
            sourceApi: 'marketcheck'
          };
          
          const docRef = db.collection('cars').doc();
          batch.set(docRef, filterUndefined(carData));
          totalCarsAdded++;
          
          // Commit batch every 400 documents (Firestore limit is 500)
          if (totalCarsAdded % 400 === 0) {
            await batch.commit();
            console.log(`Committed batch of 400 cars. Total added: ${totalCarsAdded}`);
          }
        }
        
        // Add delay between API calls to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error fetching ${params.make} vehicles:`, error.message);
        continue;
      }
    }
    
    // Commit remaining documents
    if (totalCarsAdded % 400 !== 0) {
      await batch.commit();
    }
    
    console.log(`Car population completed! Added ${totalCarsAdded} cars to Firebase.`);
    
    // Verify the count
    const finalSnapshot = await db.collection('cars').get();
    console.log(`Total cars in database: ${finalSnapshot.size}`);
    
  } catch (error) {
    console.error('Error during car population:', error);
    process.exit(1);
  }
}

// Run the population if this script is called directly
if (require.main === module) {
  populateCarsFromMarketcheck()
    .then(() => {
      console.log('Population script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Population script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateCarsFromMarketcheck };
