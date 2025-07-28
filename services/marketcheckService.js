const marketcheckClient = require('../utils/marketcheckClient');

// Search vehicles with Marketcheck, returns mapped car objects
async function searchVehicles(params) {
  const raw = await marketcheckClient.searchVehicles(params);
  const list = raw.listings || [];
  
  return list.map(listing => ({
    // Basic vehicle info
    id: listing.id,
    vin: listing.vin,
    heading: listing.heading,
    price: listing.price || listing.msrp,
    msrp: listing.msrp,
    miles: listing.miles,
    vdpUrl: listing.vdp_url,
    
    // Build information (from build object)
    year: listing.build?.year,
    make: listing.build?.make,
    model: listing.build?.model,
    trim: listing.build?.trim,
    version: listing.build?.version,
    bodyType: listing.build?.body_type,
    vehicleType: listing.build?.vehicle_type,
    transmission: listing.build?.transmission,
    drivetrain: listing.build?.drivetrain,
    fuelType: listing.build?.fuel_type,
    engine: listing.build?.engine,
    engineSize: listing.build?.engine_size,
    doors: listing.build?.doors,
    cylinders: listing.build?.cylinders,
    cityMpg: listing.build?.city_mpg,
    highwayMpg: listing.build?.highway_mpg,
    seating: listing.build?.std_seating,
    
    // Colors
    exteriorColor: listing.exterior_color,
    interiorColor: listing.interior_color,
    baseExtColor: listing.base_ext_color,
    baseIntColor: listing.base_int_color,
    
    // Media (images)
    media: {
      photoLinks: listing.media?.photo_links || [],
      photoCached: listing.media?.photo_links_cached || []
    },
    
    // Dealer information
    dealer: {
      id: listing.dealer?.id,
      name: listing.dealer?.name,
      website: listing.dealer?.website,
      dealerType: listing.dealer?.dealer_type,
      street: listing.dealer?.street,
      city: listing.dealer?.city,
      state: listing.dealer?.state,
      country: listing.dealer?.country,
      lat: parseFloat(listing.dealer?.latitude) || 0,
      lng: parseFloat(listing.dealer?.longitude) || 0,
      zip: listing.dealer?.zip,
      phone: listing.dealer?.phone
    },
    
    // Additional data
    inventoryType: listing.inventory_type,
    sellerType: listing.seller_type,
    stockNo: listing.stock_no,
    source: listing.source,
    dataSource: listing.data_source,
    
    // Carfax info
    carfaxOneOwner: listing.carfax_1_owner,
    carfaxCleanTitle: listing.carfax_clean_title,
    
    // Timestamps
    lastSeenAt: listing.last_seen_at_date,
    scrapedAt: listing.scraped_at_date,
    firstSeenAt: listing.first_seen_at_date
  }));
}

async function getVehicleByVin(vin) {
  const raw = await marketcheckClient.getListingByVin(vin);
  if (!raw) throw new Error('Vehicle not found');
  // reuse mapping logic or call searchVehicles with vin filter
  return searchVehicles({ vin, api_key: process.env.MARKETCHECK_API_KEY })
    .then(results => results[0]);
}

module.exports = { searchVehicles, getVehicleByVin };