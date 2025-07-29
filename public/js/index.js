// index.js - User Dashboard
let token = localStorage.getItem('token');
const userEmail = localStorage.getItem('userEmail');

// Navigation functions (defined first so they're available immediately)
function goToAuth() {
    console.log('goToAuth called');
    try {
        window.location.href = '/auth.html';
    } catch (error) {
        console.error('Error in goToAuth:', error);
    }
}

function goToManager() {
    console.log('goToManager called');
    try {
        // Check if user has admin role
        const role = localStorage.getItem('role');
        console.log('User role:', role);
        if (role === 'admin' || role === 'manager') {
            window.location.href = '/manager.html';
        } else {
            alert('Access denied. You do not have permission to access the manager page.');
        }
    } catch (error) {
        console.error('Error in goToManager:', error);
    }
}

function goToIndex() {
    console.log('goToIndex called');
    try {
        // Already on index page, just refresh or do nothing
        window.location.reload();
    } catch (error) {
        console.error('Error in goToIndex:', error);
    }
}

// Enhanced logout function that uses token manager
function logout() {
    console.log('Logout initiated');
    if (window.tokenManager) {
        window.tokenManager.logout();
    } else {
        // Fallback to old method
        localStorage.clear();
        window.location.href = '/auth.html';
    }
}

// Make navigation functions globally available immediately
window.goToAuth = goToAuth;
window.goToManager = goToManager;
window.goToIndex = goToIndex;
window.logout = logout;

// Check authentication - but don't redirect immediately, let page load first
let authCheckDone = false;

// Debug mode - set this to true to skip authentication for testing
const DEBUG_MODE = window.location.search.includes('debug=true');

console.log('Debug mode:', DEBUG_MODE);
console.log('Token available:', !!token);
console.log('User email:', userEmail);

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('Index.js DOMContentLoaded started');
  
  // Initialize token manager and check session
  if (window.tokenManager) {
    const hasValidSession = window.tokenManager.init();
    if (!hasValidSession && !DEBUG_MODE) {
      console.log('No valid session found, redirecting to auth page');
      window.location.href = 'auth.html';
      return;
    }
    // Update token from token manager
    token = localStorage.getItem('token');
  } else if (!token && !DEBUG_MODE) {
    console.log('No token found and token manager not available, redirecting to auth page');
    window.location.href = 'auth.html';
    return;
  }
  
  try {
    // Welcome message
    if (userEmail) {
      document.getElementById('userWelcome').textContent = `Welcome, ${userEmail}`;
      console.log('Welcome message set');
    }

    // Show manager button only for admin/manager roles
    const role = localStorage.getItem('role');
    const managerBtn = document.getElementById('managerPageBtn');
    if (managerBtn) {
      if (role === 'admin' || role === 'manager') {
        managerBtn.style.display = 'inline-block';
        console.log('Manager button shown for role:', role);
      } else {
        managerBtn.style.display = 'none';
        console.log('Manager button hidden for role:', role);
      }
    } else {
      console.warn('Manager button element not found');
    }

    // Initialize Socket.IO for real-time alerts
    const socket = io();
    console.log('Socket.IO initialized');
    
    socket.on('newAlert', (alert) => {
      showAlertToast(alert.message);
    });

    // Logout functionality
    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
      logoutButton.onclick = () => {
        console.log('Logout button clicked');
        localStorage.clear();
        window.location.href = 'auth.html';
      };
      console.log('Logout button event listener set');
    } else {
      console.error('Logout button element not found');
    }

    // Get random cars functionality
    const randomButton = document.getElementById('randomBtn');
    if (randomButton) {
      randomButton.onclick = getRandomCars;
      console.log('Random button event listener set');
    } else {
      console.error('Random button element not found');
    }
    
    console.log('Index.js DOMContentLoaded completed successfully');
    
    // Debug: Check if functions are available globally
    console.log('Global functions available:');
    console.log('- goToAuth:', typeof window.goToAuth);
    console.log('- goToManager:', typeof window.goToManager);
    console.log('- goToIndex:', typeof window.goToIndex);
    console.log('- getRandomCars:', typeof window.getRandomCars);
    
  } catch (error) {
    console.error('Error in DOMContentLoaded:', error);
  }
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

    // Get valid token from token manager
    const validToken = window.tokenManager ? await window.tokenManager.getValidToken() : token;
    if (!validToken) {
      throw new Error('No valid authentication token');
    }

    const response = await fetch('/api/cars/random?count=3', {
      headers: { 
        'Authorization': `Bearer ${validToken}` 
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

// Make getRandomCars globally available
window.getRandomCars = getRandomCars;

// Get the best image URL from the media array
function getBestImageUrl(car) {
  // Priority: media array > mediaCached > fallback
  if (car.media && car.media.length > 0) {
    return car.media[0];
  }
  if (car.mediaCached && car.mediaCached.length > 0) {
    return car.mediaCached[0];
  }
  return 'https://via.placeholder.com/300x200?text=No+Image';
}

// Global storage for car data
let carDataStore = {};

// Helper function to get valid token for API calls
async function getValidAuthToken() {
  if (window.tokenManager) {
    const validToken = await window.tokenManager.getValidToken();
    if (!validToken) {
      console.log('Token validation failed, redirecting to auth');
      window.location.href = '/auth.html';
      return null;
    }
    return validToken;
  }
  return token; // Fallback to stored token
}

// Display cars in the UI
function displayCars(cars) {
  const carsContainer = document.getElementById('carsContainer');
  
  // Store car data for photo gallery access
  cars.forEach(car => {
    carDataStore[car.vin] = car;
  });
  
  carsContainer.innerHTML = cars.map(car => {
    const imageUrl = getBestImageUrl(car);
    const carTitle = `${car.year} ${car.make} ${car.model}`;
    const dealerInfo = car.dealer && car.dealer.name ? 
      `${car.dealer.name} - ${car.dealer.city}, ${car.dealer.state}` : 
      'Dealer information not available';
    
    return `
      <div class="col-md-4 mb-4">
        <div class="car-card">
          <div class="position-relative">
            <img src="${imageUrl}" 
                 class="car-image" 
                 alt="${carTitle}" 
                 onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'"
                 loading="lazy">
            ${car.inventoryType ? 
              `<span class="badge bg-info position-absolute top-0 end-0 m-2">${car.inventoryType.toUpperCase()}</span>` : 
              ''
            }
          </div>
          
          <div class="car-details">
            <h5 class="card-title">${carTitle}</h5>
            ${car.trim ? `<p class="text-muted mb-2">${car.trim}${car.version ? ` ${car.version}` : ''}</p>` : ''}
            
            <div class="row mb-3">
              <div class="col-6">
                <small class="text-muted">Mileage</small><br>
                <strong>${car.miles ? car.miles.toLocaleString() : 'N/A'} miles</strong>
              </div>
              <div class="col-6">
                <small class="text-muted">MSRP</small><br>
                <span class="price-badge">$${car.msrp ? car.msrp.toLocaleString() : car.price ? car.price.toLocaleString() : 'N/A'}</span>
              </div>
            </div>

            ${car.engine || car.transmission ? `
              <div class="mb-3">
                <small class="text-muted">Engine & Transmission</small><br>
                <strong>${car.engine || 'N/A'}</strong><br>
                <small>${car.transmission || 'N/A'}${car.drivetrain ? ` • ${car.drivetrain}` : ''}</small>
              </div>
            ` : ''}

            ${car.cityMpg || car.highwayMpg ? `
              <div class="mb-3">
                <small class="text-muted">Fuel Economy</small><br>
                <small>
                  ${car.cityMpg ? `${car.cityMpg} city` : ''}
                  ${car.cityMpg && car.highwayMpg ? ' / ' : ''}
                  ${car.highwayMpg ? `${car.highwayMpg} hwy` : ''} mpg
                </small>
              </div>
            ` : ''}

            <div class="mb-3">
              <small class="text-muted">Dealer</small><br>
              <strong>${dealerInfo}</strong>
            </div>

            <div class="d-grid gap-2">
              ${car.vdpUrl ? 
                `<a href="${car.vdpUrl}" target="_blank" class="btn btn-primary btn-custom">
                  <i class="fas fa-external-link-alt me-2"></i>View Listing
                </a>` : ''
              }
              <button class="btn btn-outline-success btn-custom" onclick="showDealershipMap('${car.vin}', '${carTitle.replace(/'/g, "\\'")}')">
                <i class="fas fa-map-marker-alt me-2"></i>Find Dealerships
              </button>
              <!-- Always show photo button for testing -->
              <button class="btn btn-outline-info btn-custom" onclick="showImageGalleryByVin('${car.vin}', '${carTitle.replace(/'/g, "\\'")}')">
                <i class="fas fa-images me-2"></i>View All Photos (${car.media ? car.media.length : 0})
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Wrapper function to get car data by VIN and show gallery
function showImageGalleryByVin(vin, carName) {
  console.log('showImageGalleryByVin called with:', { vin, carName });
  const car = carDataStore[vin];
  if (car && car.media) {
    showImageGallery(vin, carName, JSON.stringify(car.media));
  } else {
    console.warn('No car data or media found for VIN:', vin);
    showImageGallery(vin, carName, '[]');
  }
}

// Show image gallery for a car
function showImageGallery(vin, carName, mediaJson) {
  console.log('showImageGallery called with:', { vin, carName, mediaJson: mediaJson?.substring(0, 100) + '...' });
  
  try {
    const photoModal = new bootstrap.Modal(document.getElementById('photoModal'));
    const photoGallery = document.getElementById('photoGallery');
    const modalTitle = document.getElementById('photoModalLabel');
    
    console.log('Modal elements found:', {
      photoModal: !!document.getElementById('photoModal'),
      photoGallery: !!photoGallery,
      modalTitle: !!modalTitle
    });
    
    // Parse the media data
    let media = [];
    try {
      media = JSON.parse(mediaJson);
      console.log('Parsed media array:', media.length, 'items');
    } catch (e) {
      console.error('Error parsing media JSON:', e);
      console.error('Raw mediaJson:', mediaJson);
      media = [];
    }
    
    modalTitle.innerHTML = `<i class="fas fa-images me-2"></i>Photos for ${carName}`;
    
    if (!media || media.length === 0) {
      photoGallery.innerHTML = `
        <div class="col-12 text-center">
          <i class="fas fa-image fa-3x text-muted mb-3"></i>
          <p>No photos available for this vehicle.</p>
        </div>
      `;
    } else {
      // Create photo grid
      photoGallery.innerHTML = media.map((photo, index) => `
        <div class="col-lg-4 col-md-6 col-sm-12">
          <div class="card h-100">
            <img src="${photo}" class="card-img-top photo-thumbnail" alt="Vehicle Photo ${index + 1}" 
                 style="height: 250px; object-fit: cover; cursor: pointer;"
                 onclick="openLightbox('${photo}', ${index}, ${media.length})"
                 onerror="this.src='https://via.placeholder.com/400x250?text=Image+Not+Available'">
            <div class="card-body p-2">
              <small class="text-muted">Photo ${index + 1} of ${media.length}</small>
            </div>
          </div>
        </div>
      `).join('');
    }
    
    console.log('About to show photo modal');
    photoModal.show();
    console.log('Photo modal show() called');
  } catch (error) {
    console.error('Error showing image gallery:', error);
    alert('Failed to load photo gallery. Please try again.');
  }
}

// Open lightbox for full-size image viewing
function openLightbox(imageSrc, currentIndex, totalImages) {
  // Create lightbox overlay
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox-overlay';
  lightbox.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    cursor: pointer;
  `;
  
  lightbox.innerHTML = `
    <div style="position: relative; max-width: 90%; max-height: 90%;">
      <img src="${imageSrc}" style="max-width: 100%; max-height: 100%; object-fit: contain;" 
           onerror="this.src='https://via.placeholder.com/800x600?text=Image+Not+Available'">
      <div style="position: absolute; top: 10px; right: 10px;">
        <button class="btn btn-light btn-sm" onclick="this.closest('.lightbox-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); color: white; text-align: center;">
        <small>Photo ${currentIndex + 1} of ${totalImages}</small>
      </div>
    </div>
  `;
  
  // Close on click outside image
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      lightbox.remove();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', function escapeHandler(e) {
    if (e.key === 'Escape') {
      lightbox.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  });
  
  document.body.appendChild(lightbox);
}

// Make functions globally accessible
window.showImageGallery = showImageGallery;
window.openLightbox = openLightbox;

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

    // Get valid token from token manager
    const validToken = window.tokenManager ? await window.tokenManager.getValidToken() : token;
    if (!validToken) {
      throw new Error('No valid authentication token');
    }

    // Fetch dealerships from MarketCheck data
    const response = await fetch(`/api/cars/${vin}/dealerships`, {
      headers: { 
        'Authorization': `Bearer ${validToken}` 
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
          <p>No dealerships found for this vehicle.</p>
        </div>
      `;
      return;
    }

    // Store dealerships globally for map updates
    window.currentDealerships = dealerships;
    window.selectedDealershipIndex = 0; // Start with first dealership

    // Display dealerships list with clickable rows
    dealershipsList.innerHTML = `
      <h6>Found ${dealerships.length} dealership(s):</h6>
      <div class="list-group" id="dealershipListItems">
        ${dealerships.map((dealer, index) => `
          <div class="list-group-item list-group-item-action dealership-item ${index === 0 ? 'active' : ''}" 
               onclick="selectDealership(${index})" 
               data-index="${index}"
               style="cursor: pointer;">
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">
                ${dealer.name || 'Unknown Dealership'}
                ${dealer.isPrimary ? '<span class="badge bg-primary ms-2">Primary</span>' : ''}
              </h6>
              <small class="text-muted dealer-location">📍 ${dealer.city}, ${dealer.state}</small>
            </div>
            <p class="mb-1">${dealer.address || 'Address not available'}</p>
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted">📞 ${dealer.phone || 'Phone not available'}</small>
              <small class="map-status ${index === 0 ? 'text-primary' : 'text-muted'}">
                ${index === 0 ? '<i class="fas fa-map-marker-alt me-1"></i>Showing on map' : 'Click to view on map'}
              </small>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Add event listeners as backup for onclick
    setTimeout(() => {
      const dealershipItems = document.querySelectorAll('.dealership-item');
      dealershipItems.forEach((item, index) => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Click event listener triggered for index:', index);
          selectDealership(index);
        });
      });
    }, 100);

    // Initialize map with first dealership
    if (window.googleMapsLoaded && window.google) {
      initializeSingleDealershipMap(dealerships[0]);
    } else {
      // Fallback display
      const dealer = dealerships[0];
      mapContainer.innerHTML = `
        <div class="bg-light d-flex align-items-center justify-content-center h-100 rounded">
          <div class="text-center">
            <i class="fas fa-map fa-3x text-primary mb-3"></i>
            <h5>${dealer.name}</h5>
            <p class="text-muted">${dealer.address}</p>
            <p class="text-muted">📞 ${dealer.phone}</p>
            <small class="text-info">Add your Google Maps API key to enable interactive maps</small>
          </div>
        </div>
      `;
    }

  } catch (error) {
    console.error('Error fetching dealerships:', error);
    
    let errorMessage = 'Failed to load dealership information.';
    if (error.message.includes('404')) {
      errorMessage = 'Car not found in the database.';
    } else if (error.message.includes('400')) {
      errorMessage = 'No dealer information available for this vehicle.';
    } else if (error.message.includes('401')) {
      errorMessage = 'Authentication required. Please log in again.';
    }
    
    mapContainer.innerHTML = `
      <div class="text-center p-4">
        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
        <p>${errorMessage}</p>
        <small class="text-muted">Error details: ${error.message}</small>
        <br><br>
        <button class="btn btn-primary" onclick="showDealershipMap('${vin}', '${carName}')">
          <i class="fas fa-redo me-2"></i>Retry
        </button>
      </div>
    `;
    
    dealershipsList.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Unable to load dealership list. ${errorMessage}
      </div>
    `;
  }
}

// Function to select and display a specific dealership
function selectDealership(index) {
  console.log('selectDealership called with index:', index);
  console.log('currentDealerships:', window.currentDealerships);
  
  if (!window.currentDealerships || index >= window.currentDealerships.length) {
    console.error('Invalid dealership index or no dealerships loaded');
    console.error('Index:', index, 'Array length:', window.currentDealerships?.length);
    return;
  }

  window.selectedDealershipIndex = index;
  const dealer = window.currentDealerships[index];
  console.log('Selected dealer:', dealer);

  // Update active state in the list
  const dealershipItems = document.querySelectorAll('.dealership-item');
  console.log('Found dealership items:', dealershipItems.length);
  
  dealershipItems.forEach((item, i) => {
    if (i === index) {
      item.classList.add('active');
      const mapStatus = item.querySelector('.map-status');
      if (mapStatus) {
        mapStatus.innerHTML = '<i class="fas fa-map-marker-alt me-1"></i>Showing on map';
        mapStatus.className = 'map-status text-primary';
      }
    } else {
      item.classList.remove('active');
      const mapStatus = item.querySelector('.map-status');
      if (mapStatus) {
        mapStatus.innerHTML = 'Click to view on map';
        mapStatus.className = 'map-status text-muted';
      }
    }
  });

  // Update the map
  if (window.googleMapsLoaded && window.google) {
    console.log('Updating map with dealer:', dealer.name);
    initializeSingleDealershipMap(dealer);
  } else {
    // Update fallback display
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.innerHTML = `
      <div class="bg-light d-flex align-items-center justify-content-center h-100 rounded">
        <div class="text-center">
          <i class="fas fa-map fa-3x text-primary mb-3"></i>
          <h5>${dealer.name}</h5>
          <p class="text-muted">${dealer.address}</p>
          <p class="text-muted">📞 ${dealer.phone}</p>
          <small class="text-info">Add your Google Maps API key to enable interactive maps</small>
        </div>
      </div>
    `;
  }
}

// Make the function globally accessible
window.selectDealership = selectDealership;

// Debug function to test dealership selection
window.testDealershipSelection = function() {
  console.log('Testing dealership selection...');
  console.log('currentDealerships:', window.currentDealerships);
  console.log('selectDealership function:', typeof window.selectDealership);
  
  if (window.currentDealerships && window.currentDealerships.length > 1) {
    console.log('Testing selection of second dealership...');
    selectDealership(1);
  } else {
    console.log('Not enough dealerships to test with');
  }
};


// Initialize Google Maps with single dealership
function initializeSingleDealershipMap(dealer) {
  const mapContainer = document.getElementById('mapContainer');
  
  if (!dealer || !dealer.lat || !dealer.lng) {
    mapContainer.innerHTML = `
      <div class="text-center p-4">
        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
        <p>Unable to display map for this dealership.</p>
        <small class="text-muted">Location coordinates not available</small>
      </div>
    `;
    return;
  }

  const lat = parseFloat(dealer.lat);
  const lng = parseFloat(dealer.lng);

  const mapOptions = {
    zoom: 15,
    center: { lat, lng },
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  const map = new google.maps.Map(mapContainer, mapOptions);

  // Create marker for the dealership
  const marker = new google.maps.Marker({
    position: { lat, lng },
    map: map,
    title: dealer.name || 'Dealership',
    animation: google.maps.Animation.DROP,
    icon: {
      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
      scaledSize: new google.maps.Size(40, 40)
    }
  });

  // Create info window with detailed dealership information
  const infoWindow = new google.maps.InfoWindow({
    content: `
      <div style="max-width: 300px; padding: 10px;">
        <h6 class="mb-2">${dealer.name || 'Unknown Dealership'}</h6>
        <p class="mb-1"><i class="fas fa-map-marker-alt text-primary me-2"></i>${dealer.address || 'Address not available'}</p>
        <p class="mb-1"><i class="fas fa-phone text-success me-2"></i>${dealer.phone && dealer.phone !== 'Phone not available' ? dealer.phone : 'Phone not available'}</p>
        ${dealer.website ? `<p class="mb-1"><i class="fas fa-globe text-info me-2"></i><a href="${dealer.website}" target="_blank">Visit Website</a></p>` : ''}
        ${dealer.dealerType && dealer.dealerType !== 'Unknown' ? `<p class="mb-0"><small class="text-muted">Type: ${dealer.dealerType}</small></p>` : ''}
      </div>
    `
  });

  // Show info window by default
  infoWindow.open(map, marker);

  // Click marker to toggle info window
  marker.addListener('click', () => {
    if (infoWindow.getMap()) {
      infoWindow.close();
    } else {
      infoWindow.open(map, marker);
    }
  });
}

// Initialize Google Maps with dealership markers (legacy function - keeping for compatibility)
function initializeGoogleMap(dealerships, carName) {
  const mapContainer = document.getElementById('mapContainer');
  
  if (!dealerships || dealerships.length === 0) return;

  // Calculate map center (average of all dealership locations)
  const avgLat = dealerships.reduce((sum, d) => sum + (d.lat || 0), 0) / dealerships.length;
  const avgLng = dealerships.reduce((sum, d) => sum + (d.lng || 0), 0) / dealerships.length;

  const mapOptions = {
    zoom: 10,
    center: { lat: avgLat, lng: avgLng },
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  const map = new google.maps.Map(mapContainer, mapOptions);
  const bounds = new google.maps.LatLngBounds();

  // Add markers for each dealership
  dealerships.forEach((dealer, index) => {
    const lat = dealer.lat || 0;
    const lng = dealer.lng || 0;
    
    if (lat && lng) {
      const position = { lat: parseFloat(lat), lng: parseFloat(lng) };
      
      const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: dealer.name || 'Dealership',
        animation: google.maps.Animation.DROP,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.maps.Size(32, 32)
        }
      });

      // Info window for each marker
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="max-width: 250px;">
            <h6>${dealer.name || 'Unknown Dealership'}</h6>
            <p class="mb-1">${dealer.address || 'Address not available'}</p>
            <small class="text-muted">${dealer.city || 'Unknown City'}, ${dealer.state || 'Unknown State'}</small>
            ${dealer.phone && dealer.phone !== 'Phone not available' ? `<br><small class="text-primary">📞 ${dealer.phone}</small>` : ''}
            ${dealer.rating ? `<br><small class="text-warning">⭐ ${dealer.rating}/5</small>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      bounds.extend(position);
    }
  });

  // Fit map to show all markers
  if (dealerships.length > 1) {
    map.fitBounds(bounds);
  }
}

// Make function globally available
window.showDealershipMap = showDealershipMap;
window.showImageGallery = showImageGallery;
window.showImageGalleryByVin = showImageGalleryByVin;

// Debug and test functions
window.testAllFunctions = function() {
  console.log('=== TESTING ALL FUNCTIONS ===');
  
  // Test navigation functions
  console.log('Navigation functions:');
  console.log('- goToAuth:', typeof window.goToAuth, window.goToAuth);
  console.log('- goToManager:', typeof window.goToManager, window.goToManager);
  console.log('- goToIndex:', typeof window.goToIndex, window.goToIndex);
  
  // Test other functions
  console.log('Other functions:');
  console.log('- getRandomCars:', typeof window.getRandomCars, window.getRandomCars);
  console.log('- showImageGallery:', typeof window.showImageGallery, window.showImageGallery);
  console.log('- showDealershipMap:', typeof window.showDealershipMap, window.showDealershipMap);
  
  // Test DOM elements
  console.log('DOM elements:');
  console.log('- logoutBtn:', document.getElementById('logoutBtn'));
  console.log('- randomBtn:', document.getElementById('randomBtn'));
  console.log('- authPageBtn:', document.getElementById('authPageBtn'));
  console.log('- managerPageBtn:', document.getElementById('managerPageBtn'));
  
  console.log('=== END TEST ===');
};

// Test buttons functionality
window.testButtons = function() {
  console.log('=== TESTING BUTTON CLICKS ===');
  
  const authBtn = document.getElementById('authPageBtn');
  const managerBtn = document.getElementById('managerPageBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const randomBtn = document.getElementById('randomBtn');
  
  if (authBtn) {
    console.log('Auth button found, testing onclick...');
    try {
      authBtn.click();
    } catch (e) {
      console.error('Auth button click failed:', e);
    }
  } else {
    console.error('Auth button not found');
  }
  
  console.log('=== END BUTTON TEST ===');
};

// Test photo gallery functionality
window.testPhotoGallery = function() {
  console.log('=== TESTING PHOTO GALLERY ===');
  
  // Test with sample data
  const testMedia = ['https://via.placeholder.com/400x300/FF0000/FFFFFF?text=Photo1',
                     'https://via.placeholder.com/400x300/00FF00/FFFFFF?text=Photo2',
                     'https://via.placeholder.com/400x300/0000FF/FFFFFF?text=Photo3'];
  
  const testMediaJson = JSON.stringify(testMedia);
  
  console.log('Testing showImageGallery function...');
  console.log('Function available:', typeof window.showImageGallery);
  
  if (typeof window.showImageGallery === 'function') {
    try {
      window.showImageGallery('TEST123', 'Test Car 2024', testMediaJson);
      console.log('Photo gallery test completed');
    } catch (e) {
      console.error('Photo gallery test failed:', e);
    }
  } else {
    console.error('showImageGallery function not available');
  }
  
  console.log('=== END PHOTO GALLERY TEST ===');
};

// Generate test cars for debugging
window.generateTestCars = function() {
  console.log('=== GENERATING TEST CARS ===');
  
  const testCars = [
    {
      vin: 'TEST001',
      year: 2024,
      make: 'Toyota',
      model: 'Camry',
      trim: 'XLE',
      miles: 15000,
      msrp: 28000,
      media: [
        'https://via.placeholder.com/400x300/FF0000/FFFFFF?text=Toyota1',
        'https://via.placeholder.com/400x300/00FF00/FFFFFF?text=Toyota2',
        'https://via.placeholder.com/400x300/0000FF/FFFFFF?text=Toyota3'
      ],
      dealer: {
        name: 'Test Toyota Dealer',
        city: 'Los Angeles',
        state: 'CA'
      }
    },
    {
      vin: 'TEST002',
      year: 2023,
      make: 'Honda',
      model: 'Civic',
      trim: 'Sport',
      miles: 22000,
      msrp: 25000,
      media: [
        'https://via.placeholder.com/400x300/FF00FF/FFFFFF?text=Honda1',
        'https://via.placeholder.com/400x300/00FFFF/FFFFFF?text=Honda2'
      ],
      dealer: {
        name: 'Test Honda Dealer',
        city: 'San Francisco',
        state: 'CA'
      }
    }
  ];
  
  console.log('Displaying test cars...');
  displayCars(testCars);
  console.log('Test cars generated');
};
