// index.js
const token = localStorage.getItem('token');
if (!token) return window.location.href = 'auth.html';

document.getElementById('logoutBtn').onclick = () => {
  localStorage.clear();
  window.location.href = 'auth.html';
};

const socket = io();
socket.on('newAlert', alert => window.alert(alert.message));

document.getElementById('randomBtn').onclick = async () => {
  const res = await fetch('/api/cars/random?count=3', {
    headers:{ Authorization:`Bearer ${token}` }
  });
  const cars = await res.json();
  const container = document.getElementById('carsContainer');
  container.innerHTML = cars.map(c => `
    <div class="card mb-3 p-2">
      <h5>${c.year} ${c.make} ${c.model}</h5>
      <p>Miles: ${c.miles} | MSRP: $${c.price}</p>
      <a href="${c.vdpUrl}" target="_blank" class="btn btn-sm">View Listing</a>
      <button class="btn btn-sm" onclick="showDealers('${c.vin}', this)">Find on Map</button>
      <div class="dealers mt-2"></div>
    </div>
  `).join('');
};

window.showDealers = async (vin, btn) => {
  const res = await fetch(`/api/cars/${vin}/dealerships?radius=20000`, {
    headers:{ Authorization:`Bearer ${token}` }
  });
  const dealers = await res.json();
  btn.nextElementSibling.innerHTML = `
    <ul>
      ${dealers.map(d=>`<li>${d.name} – ${d.address}</li>`).join('')}
    </ul>
  `;
};
