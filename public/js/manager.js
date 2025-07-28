// manager.js - Manager Dashboard
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
const userEmail = localStorage.getItem('userEmail');

// Debug mode - set this to true to skip authentication for testing
const DEBUG_MODE = window.location.search.includes('debug=true');

console.log('Manager Debug mode:', DEBUG_MODE);
console.log('Manager Token available:', !!token);
console.log('Manager User role:', role);
console.log('Manager User email:', userEmail);

// Global variables
let currentPage = 1;
let totalPages = 1;

// Global storage for car data (for photo gallery access)
let carDataStore = {};

// Navigation functions
function goToIndex() {
    console.log('goToIndex called from manager');
    window.location.href = '/';
}

function goToAuth() {
    console.log('goToAuth called from manager');
    window.location.href = '/auth.html';
}

function goToManager() {
    console.log('goToManager called from manager');
    // Already on manager page, just refresh or do nothing
    window.location.reload();
}

// Make navigation functions globally available immediately
window.goToIndex = goToIndex;
window.goToAuth = goToAuth;
window.goToManager = goToManager;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('Manager.js DOMContentLoaded started');
  
  // Check authentication and authorization first
  if (!token || (!DEBUG_MODE && (role !== 'admin' && role !== 'manager'))) {
    console.log('Manager: Authentication failed, redirecting to auth page');
    localStorage.clear();
    window.location.href = 'auth.html';
    return;
  }
  
  try {
    // Welcome message
    if (userEmail) {
      document.getElementById('userWelcome').textContent = `Welcome, ${userEmail} (${role})`;
      console.log('Welcome message set for manager');
    }

    // Initialize Socket.IO
    const socket = io();
    console.log('Socket.IO initialized in manager');
    
    socket.on('newAlert', (alert) => {
      console.log('New alert sent:', alert);
    });

    // Event listeners
    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
      logoutButton.onclick = logout;
      console.log('Logout button event listener set in manager');
    } else {
      console.error('Logout button not found in manager');
    }
    
    const sendAlertButton = document.getElementById('sendAlertBtn');
    if (sendAlertButton) {
      sendAlertButton.onclick = sendAlert;
      console.log('Send alert button event listener set');
    } else {
      console.error('Send alert button not found');
    }

    // Load initial data
    loadDashboardData();
    
    console.log('Manager.js DOMContentLoaded completed');
    
    // Debug: Check if navigation functions are available globally
    console.log('Manager navigation functions available:');
    console.log('- goToIndex:', typeof window.goToIndex);
    console.log('- goToAuth:', typeof window.goToAuth);
    console.log('- goToManager:', typeof window.goToManager);
    
  } catch (error) {
    console.error('Error in manager DOMContentLoaded:', error);
  }
});

// Logout functionality
function logout() {
  localStorage.clear();
  window.location.href = 'auth.html';
}

// Load dashboard data
async function loadDashboardData() {
  await Promise.all([
    loadStats(),
    loadUsers(),
    loadCars()
  ]);
}

// Load statistics
async function loadStats() {
  try {
    // Load cars count
    const carsResponse = await fetch('/api/cars?page=1&limit=1', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (carsResponse.ok) {
      const carsData = await carsResponse.json();
      document.getElementById('totalCars').textContent = carsData.pagination?.total || 0;
    }

    // Load users count
    const usersResponse = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      document.getElementById('totalUsers').textContent = users.length;
    }

    // For alerts count, we'll just show a placeholder since we don't have a specific endpoint
    document.getElementById('totalAlerts').textContent = '---';

  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load users for alert dropdown
async function loadUsers() {
  try {
    const response = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const users = await response.json();
    const userSelect = document.getElementById('userSelect');
    
    userSelect.innerHTML = `
      <option value="">Select a user...</option>
      ${users.filter(u => u.role === 'user').map(user => 
        `<option value="${user.uid}">${user.name || user.email} (${user.email})</option>`
      ).join('')}
    `;

  } catch (error) {
    console.error('Error loading users:', error);
    document.getElementById('userSelect').innerHTML = '<option value="">Error loading users</option>';
  }
}

// Get the best image URL from the media array
function getBestImageUrl(car) {
  // Priority: media array > mediaCached > fallback
  if (car.media && car.media.length > 0) {
    return car.media[0];
  }
  if (car.mediaCached && car.mediaCached.length > 0) {
    return car.mediaCached[0];
  }
  return 'https://via.placeholder.com/60x40?text=No+Image';
}

// Load cars with pagination
async function loadCars(page = 1) {
  const loadingSpinner = document.getElementById('carsLoadingSpinner');
  const carsTable = document.getElementById('carsTable');
  
  try {
    loadingSpinner.style.display = 'block';
    carsTable.innerHTML = '';

    const response = await fetch(`/api/cars?page=${page}&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const { cars, pagination } = data;

    // Store car data for photo gallery access
    cars.forEach(car => {
      carDataStore[car.vin] = car;
    });

    currentPage = pagination.page;
    totalPages = pagination.pages;

    if (cars.length === 0) {
      carsTable.innerHTML = `
        <div class="text-center p-4">
          <i class="fas fa-car fa-3x text-muted mb-3"></i>
          <p>No cars found in the database.</p>
          <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addCarModal">Add First Car</button>
        </div>
      `;
      return;
    }

    // Create table
    carsTable.innerHTML = `
      <table class="table table-hover">
        <thead class="table-dark">
          <tr>
            <th>Image</th>
            <th>Vehicle</th>
            <th>Details</th>
            <th>Price</th>
            <th>Dealer</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${cars.map(car => {
            const imageUrl = getBestImageUrl(car);
            const carTitle = `${car.year} ${car.make} ${car.model}`;
            
            return `
            <tr>
              <td>
                <div class="position-relative">
                  <img src="${imageUrl}" 
                       alt="${carTitle}" 
                       style="width: 60px; height: 40px; object-fit: cover; border-radius: 5px; cursor: pointer;" 
                       onerror="this.src='https://via.placeholder.com/60x40?text=No+Image'"
                       ${car.media && car.media.length > 1 ? 
                         `onclick="showImageGalleryByVin('${car.vin}', '${carTitle.replace(/'/g, "\\'")}');" title="Click to view ${car.media.length} photos"` : 
                         ''
                       }>
                  ${car.media && car.media.length > 1 ? 
                    `<span class="position-absolute top-0 end-0 badge bg-info" style="font-size: 8px; transform: translate(50%, -50%);">${car.media.length}</span>` : 
                    ''
                  }
                </div>
              </td>
              <td>
                <strong>${carTitle}</strong><br>
                <small class="text-muted">${car.trim || 'N/A'}</small><br>
                <small class="text-muted">VIN: ${car.vin}</small>
              </td>
              <td>
                <small>
                  Miles: ${car.miles ? car.miles.toLocaleString() : 'N/A'}<br>
                  Engine: ${car.engine || 'N/A'}<br>
                  Transmission: ${car.transmission || 'N/A'}
                </small>
              </td>
              <td>
                <span class="badge bg-success">$${car.msrp ? car.msrp.toLocaleString() : car.price ? car.price.toLocaleString() : 'N/A'}</span>
              </td>
              <td>
                <small>
                  ${car.dealer ? `
                    <strong>${car.dealer.name}</strong><br>
                    ${car.dealer.city}, ${car.dealer.state}
                  ` : 'N/A'}
                </small>
              </td>
              <td>
                <div class="btn-group" role="group">
                  <button class="btn btn-sm btn-outline-primary" onclick="viewCar('${car.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-info" onclick="showImageGalleryByVin('${car.vin}', '${carTitle.replace(/'/g, "\\'")}');" title="View Photos">
                    <i class="fas fa-camera"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-success" onclick="showDealershipMap('${car.vin}', '${carTitle.replace(/'/g, "\\'")}');" title="Find Dealerships">
                    <i class="fas fa-map-marker-alt"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteCar('${car.id}', '${carTitle}')" title="Delete Car">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>
    `;

    // Update pagination
    updatePagination();

  } catch (error) {
    console.error('Error loading cars:', error);
    carsTable.innerHTML = `
      <div class="text-center p-4">
        <i class="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>
        <p>Failed to load cars. Please try again.</p>
        <button class="btn btn-primary" onclick="loadCars()">Retry</button>
      </div>
    `;
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

// Update pagination
function updatePagination() {
  const pagination = document.getElementById('carsPagination');
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let paginationHTML = '';
  
  // Previous button
  paginationHTML += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="loadCars(${currentPage - 1})" ${currentPage === 1 ? 'tabindex="-1"' : ''}>Previous</a>
    </li>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      paginationHTML += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="loadCars(${i})">${i}</a>
        </li>
      `;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
  }

  // Next button
  paginationHTML += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="loadCars(${currentPage + 1})" ${currentPage === totalPages ? 'tabindex="-1"' : ''}>Next</a>
    </li>
  `;

  pagination.innerHTML = paginationHTML;
}

// Send alert to user
async function sendAlert() {
  const userId = document.getElementById('userSelect').value;
  const message = document.getElementById('alertMessage').value.trim();
  const sendBtn = document.getElementById('sendAlertBtn');

  if (!userId) {
    alert('Please select a user.');
    return;
  }

  if (!message) {
    alert('Please enter a message.');
    return;
  }

  try {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';

    const response = await fetch('/api/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId, message })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Clear form
    document.getElementById('userSelect').value = '';
    document.getElementById('alertMessage').value = '';

    // Show success toast
    showToast('Alert sent successfully!');

  } catch (error) {
    console.error('Error sending alert:', error);
    alert('Failed to send alert. Please try again.');
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send Alert';
  }
}

// Add new car
async function addCar() {
  const form = document.getElementById('addCarForm');
  const formData = new FormData(form);
  
  const carData = {
    vin: document.getElementById('carVin').value,
    year: parseInt(document.getElementById('carYear').value),
    make: document.getElementById('carMake').value,
    model: document.getElementById('carModel').value,
    trim: document.getElementById('carTrim').value,
    miles: parseInt(document.getElementById('carMiles').value) || 0,
    price: parseFloat(document.getElementById('carPrice').value) || 0,
    vdpUrl: document.getElementById('carVdpUrl').value
  };

  try {
    const response = await fetch('/api/cars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(carData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addCarModal'));
    modal.hide();

    // Reset form
    form.reset();

    // Reload cars
    loadCars(currentPage);

    // Show success toast
    showToast('Car added successfully!');

  } catch (error) {
    console.error('Error adding car:', error);
    alert('Failed to add car. Please try again.');
  }
}

// Delete car
async function deleteCar(carId, carName) {
  if (!confirm(`Are you sure you want to delete ${carName}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/cars/${carId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Reload cars
    loadCars(currentPage);

    // Show success toast
    showToast('Car deleted successfully!');

  } catch (error) {
    console.error('Error deleting car:', error);
    alert('Failed to delete car. Please try again.');
  }
}

// View car details (placeholder)
function viewCar(carId) {
  alert(`View car details for ID: ${carId}\n(This feature can be implemented later)`);
}

// Show success toast
function showToast(message) {
  const toastBody = document.getElementById('actionToastBody');
  const actionToast = document.getElementById('actionToast');
  
  toastBody.textContent = message;
  
  const toast = new bootstrap.Toast(actionToast);
  toast.show();
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

// Show image gallery modal
function showImageGallery(vin, carName, mediaJson) {
  try {
    const photoModal = new bootstrap.Modal(document.getElementById('photoModal'));
    const photoGallery = document.getElementById('photoGallery');
    const modalTitle = document.getElementById('photoModalLabel');
    
    // Parse the media data
    let media = [];
    try {
      media = JSON.parse(mediaJson);
    } catch (e) {
      console.error('Error parsing media JSON:', e);
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
    
    photoModal.show();
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

// Add dealership map functionality to manager
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

    // Fetch dealerships from MarketCheck data
    const response = await fetch(`/api/cars/${vin}/dealerships`, {
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

// Make functions globally available
window.loadCars = loadCars;
window.deleteCar = deleteCar;
window.viewCar = viewCar;
window.addCar = addCar;
window.showImageGallery = showImageGallery;
window.showImageGalleryByVin = showImageGalleryByVin;
window.openLightbox = openLightbox;
window.showDealershipMap = showDealershipMap;
window.selectDealership = selectDealership;
window.initializeSingleDealershipMap = initializeSingleDealershipMap;

// Debug and test functions for manager
window.testManagerFunctions = function() {
  console.log('=== TESTING MANAGER FUNCTIONS ===');
  
  // Test navigation functions
  console.log('Navigation functions:');
  console.log('- goToIndex:', typeof window.goToIndex, window.goToIndex);
  console.log('- goToAuth:', typeof window.goToAuth, window.goToAuth);
  console.log('- goToManager:', typeof window.goToManager, window.goToManager);
  
  // Test DOM elements
  console.log('DOM elements:');
  console.log('- logoutBtn:', document.getElementById('logoutBtn'));
  console.log('- indexPageBtn:', document.getElementById('indexPageBtn'));
  console.log('- authPageBtn:', document.getElementById('authPageBtn'));
  console.log('- sendAlertBtn:', document.getElementById('sendAlertBtn'));
  
  console.log('=== END MANAGER TEST ===');
};

// Test manager buttons functionality
window.testManagerButtons = function() {
  console.log('=== TESTING MANAGER BUTTON CLICKS ===');
  
  const indexBtn = document.getElementById('indexPageBtn');
  const authBtn = document.getElementById('authPageBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (indexBtn) {
    console.log('Index button found, onclick attribute:', indexBtn.getAttribute('onclick'));
  } else {
    console.error('Index button not found');
  }
  
  if (authBtn) {
    console.log('Auth button found, onclick attribute:', authBtn.getAttribute('onclick'));
  } else {
    console.error('Auth button not found');
  }
  
  console.log('=== END MANAGER BUTTON TEST ===');
};
