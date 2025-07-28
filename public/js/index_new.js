// index.js - User Dashboard
const token = localStorage.getItem('token');
const userEmail = localStorage.getItem('userEmail');

// Check authentication
if (!token) {
  window.location.href = 'auth.html';
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Welcome message
  if (userEmail) {
    document.getElementById('userWelcome').textContent = `Welcome, ${userEmail}`;
  }

  // Initialize Socket.IO for real-time alerts
  const socket = io();
  
  socket.on('newAlert', (alert) => {
    showAlertToast(alert.message);
  });

  // Logout functionality
  document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    window.location.href = 'auth.html';
  };

  // Get random cars functionality
  document.getElementById('randomBtn').onclick = getRandomCars;
});

// Show alert toast notification
function showAlertToast(message) {
  const toastBody = document.getElementById('alertToastBody');
  const alertToast = document.getElementById('alertToast');
  
  toastBody.textContent = message;
  
  const toast = new bootstrap.Toast(alertToast);
  toast.show();
}

// Get random cars from the API
async function getRandomCars() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  const carsContainer = document.getElementById('carsContainer');
  const randomBtn = document.getElementById('randomBtn');
  
  try {
    // Show loading state
    loadingSpinner.style.display = 'block';
    randomBtn.disabled = true;
    carsContainer.innerHTML = '';

    const response = await fetch('/api/cars/random?count=3', {
      headers: { 
        'Authorization': `Bearer ${token}` 
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const cars = await response.json();
    
    if (cars.length === 0) {
      carsContainer.innerHTML = `
        <div class="col-12 text-center text-white">
          <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
          <p>No cars found in the database. Please check back later.</p>
        </div>
      `;
      return;
    }

    // Display cars
    displayCars(cars);

  } catch (error) {
    console.error('Error fetching random cars:', error);
    carsContainer.innerHTML = `
      <div class="col-12 text-center text-white">
        <i class="fas fa-exclamation-circle fa-2x mb-3 text-warning"></i>
        <p>Failed to load cars. Please try again.</p>
        <button class="btn btn-outline-light" onclick="getRandomCars()">Retry</button>
      </div>
    `;
  } finally {
    loadingSpinner.style.display = 'none';
    randomBtn.disabled = false;
  }
}

// Display cars in the UI
function displayCars(cars) {
  const carsContainer = document.getElementById('carsContainer');
  
  carsContainer.innerHTML = cars.map(car => `
    <div class="col-md-4 mb-4">
      <div class="car-card">
        ${car.media && car.media.length > 0 ? 
          `<img src="${car.media[0]}" class="car-image" alt="${car.year} ${car.make} ${car.model}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">` : 
          `<div class="car-image bg-light d-flex align-items-center justify-content-center">
            <i class="fas fa-car fa-3x text-muted"></i>
          </div>`
        }
        <div class="car-details">
          <h5 class="card-title">${car.year} ${car.make} ${car.model}</h5>
          ${car.trim ? `<p class="text-muted mb-2">${car.trim}</p>` : ''}
          
          <div class="row mb-3">
            <div class="col-6">
              <small class="text-muted">Mileage</small><br>
              <strong>${car.miles ? car.miles.toLocaleString() : 'N/A'} miles</strong>
            </div>
            <div class="col-6">
              <small class="text-muted">Price</small><br>
              <span class="price-badge">$${car.price ? car.price.toLocaleString() : 'N/A'}</span>
            </div>
          </div>

          ${car.dealer ? `
            <div class="mb-3">
              <small class="text-muted">Dealer</small><br>
              <strong>${car.dealer.name}</strong><br>
              <small>${car.dealer.city}, ${car.dealer.state}</small>
            </div>
          ` : ''}

          <div class="d-grid gap-2">
            ${car.vdpUrl ? 
              `<a href="${car.vdpUrl}" target="_blank" class="btn btn-primary btn-custom">
                <i class="fas fa-external-link-alt me-2"></i>View Listing
              </a>` : ''
            }
            <button class="btn btn-outline-success btn-custom" onclick="showDealershipMap('${car.vin}', '${car.year} ${car.make} ${car.model}')">
              <i class="fas fa-map-marker-alt me-2"></i>Find on Map
            </button>
          </div>

          <div id="dealerships-${car.vin}" class="dealership-list" style="display: none;">
            <!-- Dealerships will be loaded here -->
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Show dealership locations on map
async function showDealershipMap(vin, carName) {
  const mapsModal = new bootstrap.Modal(document.getElementById('mapsModal'));
  const mapContainer = document.getElementById('mapContainer');
  const dealershipsList = document.getElementById('dealershipsList');
  const modalTitle = document.getElementById('mapsModalLabel');
  
  modalTitle.innerHTML = `<i class="fas fa-map-marker-alt me-2"></i>Dealerships for ${carName}`;
  
  try {
    // Show loading state
    mapContainer.innerHTML = `
      <div class="d-flex justify-content-center align-items-center h-100">
        <div class="text-center">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2">Loading dealerships...</p>
        </div>
      </div>
    `;
    dealershipsList.innerHTML = '';
    
    mapsModal.show();

    // Fetch dealerships
    const response = await fetch(`/api/cars/${vin}/dealerships?radius=20000`, {
      headers: { 
        'Authorization': `Bearer ${token}` 
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const dealerships = await response.json();
    
    if (dealerships.length === 0) {
      mapContainer.innerHTML = `
        <div class="text-center p-4">
          <i class="fas fa-map-marker-alt fa-3x text-muted mb-3"></i>
          <p>No dealerships found in the area.</p>
        </div>
      `;
      return;
    }

    // Display dealerships list
    dealershipsList.innerHTML = `
      <h6>Found ${dealerships.length} dealership(s):</h6>
      <div class="list-group">
        ${dealerships.map(dealer => `
          <div class="list-group-item">
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">${dealer.name}</h6>
              <small>📍</small>
            </div>
            <p class="mb-1">${dealer.address}</p>
          </div>
        `).join('')}
      </div>
    `;

    // For now, show a simple map placeholder
    // In a real implementation, you would integrate with Google Maps API
    mapContainer.innerHTML = `
      <div class="bg-light d-flex align-items-center justify-content-center h-100 rounded">
        <div class="text-center">
          <i class="fas fa-map fa-3x text-primary mb-3"></i>
          <p class="text-muted">Google Maps integration would go here</p>
          <small class="text-muted">Showing ${dealerships.length} dealership locations</small>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error fetching dealerships:', error);
    mapContainer.innerHTML = `
      <div class="text-center p-4">
        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
        <p>Failed to load dealership information.</p>
        <button class="btn btn-primary" onclick="showDealershipMap('${vin}', '${carName}')">Retry</button>
      </div>
    `;
  }
}

// Make function globally available
window.showDealershipMap = showDealershipMap;
