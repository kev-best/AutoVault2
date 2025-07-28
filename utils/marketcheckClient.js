const axios = require('axios');
require('dotenv').config();
const MARKET_URL = 'https://mc-api.marketcheck.com/v2/search/car/active';
const MARKET_KEY = process.env.MARKETCHECK_API_KEY;

async function searchVehicles(params) {
    const response = await axios.get(MARKET_URL, {
        params: {
            ...params,
            api_key: MARKET_KEY,
            include_relevant_links: true
        }
    });
    return response.data;
}

async function getVehicleByVin(vin) {
    const response = await axios.get(`${MARKET_URL}/vin/${encodeURIComponent(vin)}`, {
        params: {
            api_key: MARKET_KEY
        }
    });
    return response.data;
}

module.exports = {
    searchVehicles,
    getVehicleByVin
};