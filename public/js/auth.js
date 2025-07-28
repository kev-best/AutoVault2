// auth.js - Firebase Authentication Integration
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Wait for Firebase to be initialized
window.addEventListener('load', () => {
  if (!window.firebaseAuth) {
    console.error('Firebase Auth not initialized');
    return;
  }

  const auth = window.firebaseAuth;
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const errorMessage = document.getElementById('errorMessage');

  // Remove auto-login behavior - users must manually login
  // onAuthStateChanged is still useful for session management but won't auto-redirect
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('User is signed in:', user.email);
      // Don't auto-redirect - let user decide when to login
    } else {
      console.log('User is signed out');
    }
  });

  // Helper functions
  function showLoading(show = true) {
    loadingSpinner.style.display = show ? 'block' : 'none';
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  }

  function hideError() {
    errorMessage.style.display = 'none';
  }

  async function verifyAndRedirect(idToken) {
    try {
      const response = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      const data = await response.json();
      
      if (response.ok && data.user) {
        // Store token and user info
        localStorage.setItem('token', idToken);
        localStorage.setItem('role', data.user.role);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userId', data.user.uid);

        // Redirect based on role
        if (data.user.role === 'admin' || data.user.role === 'manager') {
          window.location.href = 'manager.html';
        } else {
          window.location.href = 'index.html';
        }
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      showError('Authentication failed. Please try again.');
    }
  }

  // Login form handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    showLoading();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      await verifyAndRedirect(idToken);
      
    } catch (error) {
      console.error('Login error:', error);
      let errorMsg = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMsg = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMsg = 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          errorMsg = 'Invalid email address.';
          break;
        case 'auth/too-many-requests':
          errorMsg = 'Too many failed attempts. Please try again later.';
          break;
      }
      
      showError(errorMsg);
    } finally {
      showLoading(false);
    }
  });

  // Register form handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    showLoading();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const phone = document.getElementById('registerPhone').value;
    const role = document.getElementById('registerRole').value;

    try {
      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Register user in our backend
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idToken,
          name,
          phone,
          role
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info
        localStorage.setItem('token', idToken);
        localStorage.setItem('role', role);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userId', userCredential.user.uid);

        // Redirect based on role
        if (role === 'admin' || role === 'manager') {
          window.location.href = 'manager.html';
        } else {
          window.location.href = 'index.html';
        }
      } else {
        throw new Error(data.error || 'Registration failed');
      }

    } catch (error) {
      console.error('Registration error:', error);
      let errorMsg = 'Registration failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMsg = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          errorMsg = 'Password is too weak. Please choose a stronger password.';
          break;
        case 'auth/invalid-email':
          errorMsg = 'Invalid email address.';
          break;
      }
      
      showError(errorMsg);
    } finally {
      showLoading(false);
    }
  });

  // Form validation
  const forms = document.querySelectorAll('.needs-validation');
  forms.forEach(form => {
    form.addEventListener('submit', (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    });
  });
});

// Navigation functions
function goToIndex() {
    window.location.href = '/';
}

function goToManager() {
    // Check if user has admin role
    const role = localStorage.getItem('role');
    if (role === 'admin' || role === 'manager') {
        window.location.href = '/manager.html';
    } else {
        alert('Access denied. You do not have permission to access the manager page.');
    }
}

function goToAuth() {
    // Already on auth page, just refresh or do nothing
    window.location.reload();
}
