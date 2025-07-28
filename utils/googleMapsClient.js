const axios = require('axios');
require('dotenv').config();
const PLACE_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

async function findDealerships({ lat, lng, radius = 10000 }) {
  const res = await axios.get(PLACE_URL, {
    params: {
      key: process.env.GOOGLE_MAPS_API_KEY,
      location: `${lat},${lng}`,
      radius,
      type: 'car_dealer'
    }
  });
  return res.data.results.map(d => ({
    name: d.name,
    address: d.vicinity,
    lat: d.geometry.location.lat,
    lon: d.geometry.location.lng,
    placeId: d.place_id
  }));
}

module.exports = { findDealerships };
