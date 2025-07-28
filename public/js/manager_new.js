// manager.js - Manager Dashboard
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
const userEmail = localStorage.getItem('userEmail');

// Check authentication and authorization
if (!token || (role !== 'admin' && role !== 'manager')) {
  localStorage.clear();
  window.location.href = 'auth.html';
}

// Global variables
let currentPage = 1;
let totalPages = 1;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Welcome message
  if (userEmail) {
    document.getElementById('userWelcome').textContent = `Welcome, ${userEmail} (${role})`;
  }

  // Initialize Socket.IO
  const socket = io();
  
  socket.on('newAlert', (alert) => {
    console.log('New alert sent:', alert);
  });

  // Event listeners
  document.getElementById('logoutBtn').onclick = logout;
  document.getElementById('sendAlertBtn').onclick = sendAlert;

  // Load initial data
  loadDashboardData();
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
          ${cars.map(car => `
            <tr>
              <td>
                ${car.media && car.media.length > 0 ? 
                  `<img src="${car.media[0]}" alt="${car.year} ${car.make} ${car.model}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 5px;" onerror="this.src='https://via.placeholder.com/60x40?text=No+Image'">` : 
                  `<div style="width: 60px; height: 40px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; border-radius: 5px;"><i class="fas fa-car text-muted"></i></div>`
                }
              </td>
              <td>
                <strong>${car.year} ${car.make} ${car.model}</strong><br>
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
                <span class="badge bg-success">$${car.price ? car.price.toLocaleString() : 'N/A'}</span>
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
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewCar('${car.id}')">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCar('${car.id}', '${car.year} ${car.make} ${car.model}')">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
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

// Make functions globally available
window.loadCars = loadCars;
window.deleteCar = deleteCar;
window.viewCar = viewCar;
window.addCar = addCar;
