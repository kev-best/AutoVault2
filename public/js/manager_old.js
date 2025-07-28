// manager.js
const token = localStorage.getItem('token');
const role  = localStorage.getItem('role');
if (!token || (role!=='admin' && role!=='manager')) {
  return window.location.href = 'auth.html';
}

document.getElementById('logoutBtn').onclick = () => {
  localStorage.clear();
  window.location.href = 'auth.html';
};

const socket = io();
socket.on('newAlert', alert => console.log('Alert→', alert));

async function loadUsers() {
  const res = await fetch('/api/users', {
    headers:{ Authorization:`Bearer ${token}` }
  });
  const list = await res.json();
  document.getElementById('userSelect').innerHTML =
    list.map(u=>`<option value="${u._id}">${u.name}</option>`).join('');
}

async function loadCars(page=1) {
  const res = await fetch(`/api/cars?page=${page}`, {
    headers:{ Authorization:`Bearer ${token}` }
  });
  const { cars } = await res.json();
  document.getElementById('carsTable').innerHTML =
    cars.map(c=>`
      <div class="mb-2">
        <strong>${c.year} ${c.make} ${c.model}</strong>
        <button class="btn btn-sm btn-danger" onclick="deleteCar('${c._id}')">Delete</button>
      </div>
    `).join('');
}

window.deleteCar = async id => {
  await fetch(`/api/cars/${id}`, {
    method:'DELETE',
    headers:{ Authorization:`Bearer ${token}` }
  });
  loadCars();
};

document.getElementById('sendAlertBtn').onclick = async () => {
  const userId  = document.getElementById('userSelect').value;
  const message = document.getElementById('alertMsg').value;
  await fetch('/api/alerts', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      Authorization:`Bearer ${token}`
    },
    body: JSON.stringify({ userId, message })
  });
  alert('Sent!');
};

loadUsers();
loadCars();
