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

// Display cars in the UI
function displayCars(cars) {
  const carsContainer = document.getElementById('carsContainer');
  
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
              ${car.media && car.media.length > 1 ? 
                `<button class="btn btn-outline-info btn-custom" onclick="showImageGallery('${car.vin}', '${carTitle.replace(/'/g, "\\'")}', '${JSON.stringify(car.media).replace(/'/g, "\\'")}')">
                  <i class="fas fa-images me-2"></i>View All Photos (${car.media.length})
                </button>` : ''
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
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

// Show image gallery modal
async function showImageGallery(vin, carName, mediaJson) {
  try {
    const media = JSON.parse(mediaJson);
    
    // Create and show modal
    const modalHtml = `
      <div class="modal fade" id="imageGalleryModal" tabindex="-1" aria-labelledby="imageGalleryModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="imageGalleryModalLabel">
                <i class="fas fa-images me-2"></i>${carName} - Photo Gallery
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div id="carouselGallery" class="carousel slide" data-bs-ride="carousel">
                <div class="carousel-indicators">
                  ${media.map((_, index) => 
                    `<button type="button" data-bs-target="#carouselGallery" data-bs-slide-to="${index}" ${index === 0 ? 'class="active" aria-current="true"' : ''} aria-label="Slide ${index + 1}"></button>`
                  ).join('')}
                </div>
                <div class="carousel-inner">
                  ${media.map((imageUrl, index) => `
                    <div class="carousel-item ${index === 0 ? 'active' : ''}">
                      <img src="${imageUrl}" class="d-block w-100" alt="${carName} - Image ${index + 1}" style="height: 400px; object-fit: cover;">
                    </div>
                  `).join('')}
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#carouselGallery" data-bs-slide="prev">
                  <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                  <span class="visually-hidden">Previous</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#carouselGallery" data-bs-slide="next">
                  <span class="carousel-control-next-icon" aria-hidden="true"></span>
                  <span class="visually-hidden">Next</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('imageGalleryModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('imageGalleryModal'));
    modal.show();
    
    // Clean up modal when hidden
    document.getElementById('imageGalleryModal').addEventListener('hidden.bs.modal', function () {
      this.remove();
    });
    
  } catch (error) {
    console.error('Error showing image gallery:', error);
    alert('Failed to load image gallery');
  }
}

// Make function globally available
window.showDealershipMap = showDealershipMap;
window.showImageGallery = showImageGallery;
