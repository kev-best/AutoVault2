const axios = require('axios');
require('dotenv').config();
const PLACE_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

async function getPlaceDetails(placeId) {
  try {
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const response = await axios.get(PLACE_DETAILS_URL, {
      params: {
        key: process.env.GOOGLE_MAPS_API_KEY,
        place_id: placeId,
        fields: 'formatted_phone_number,address_components,formatted_address'
      }
    });
    return response.data.result;
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
}

async function findDealerships({ lat, lng, radius = 10000 }) {
  try {
    const response = await axios.get(PLACE_URL, {
      params: {
        key: process.env.GOOGLE_MAPS_API_KEY,
        location: `${lat},${lng}`,
        radius,
        type: 'car_dealer'
      }
    });

    const dealerships = await Promise.all(
      response.data.results.map(async (dealer) => {
        // Get additional details for phone number and address components
        const details = await getPlaceDetails(dealer.place_id);
        
        // Parse address components to get city and state
        let city = '';
        let state = '';
        
        if (details && details.address_components) {
          details.address_components.forEach(component => {
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.short_name;
            }
          });
        }

        return {
          name: dealer.name || 'Unknown Dealership',
          address: dealer.vicinity || details?.formatted_address || 'Address not available',
          city: city || 'Unknown City',
          state: state || 'Unknown State',
          lat: dealer.geometry.location.lat,
          lng: dealer.geometry.location.lng, // Fixed: was 'lon'
          placeId: dealer.place_id,
          phone: details?.formatted_phone_number || 'Phone not available',
          rating: dealer.rating || null,
          priceLevel: dealer.price_level || null
        };
      })
    );

    return dealerships;
  } catch (error) {
    console.error('Error finding dealerships:', error);
    throw new Error('Failed to fetch dealerships from Google Maps API');
  }
}

module.exports = { findDealerships };
