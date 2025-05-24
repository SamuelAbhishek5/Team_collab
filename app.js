// Global state
let currentUser = null;
let currentSection = 'dashboard';

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const currentUserName = document.getElementById('current-user-name');
const sidebarMenu = document.querySelector('.sidebar-menu');

// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Authentication Functions
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    } catch (error) {
        throw error;
    }
}

async function register(name, email, password, role) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    } catch (error) {
        throw error;
    }
}

// UI Update Functions
function updateAuthDisplay(user) {
    if (user) {
        authSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        logoutBtn.style.display = 'block';
        currentUserName.textContent = user.name;
        loadDashboardData();
    } else {
        authSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        logoutBtn.style.display = 'none';
        currentUserName.textContent = 'Not logged in';
    }
}

function switchForm(show) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (show === 'register') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
}

// Data Loading Functions
async function loadDashboardData() {
    try {
        const stats = await Promise.all([
            fetchCount('projects'),
            fetchCount('tasks'),
            fetchCount('documents'),
            fetchCount('users')
        ]);
        
        document.getElementById('projects-count').textContent = stats[0].count;
        document.getElementById('tasks-count').textContent = stats[1].count;
        document.getElementById('docs-count').textContent = stats[2].count;
        document.getElementById('users-count').textContent = stats[3].count;
        
        await loadRecentActivities();
        await loadUpcomingDeadlines();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function fetchCount(resource) {
    const response = await fetch(`${API_BASE_URL}/${resource}/count`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    return response.json();
}

async function loadRecentActivities() {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks?sort=latest`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const tasks = await response.json();
        const activitiesContainer = document.getElementById('recent-activities');
        activitiesContainer.innerHTML = tasks.slice(0, 5).map(task => `
            <div class="activity-item">
                <i class="fas fa-tasks"></i>
                <div class="activity-details">
                    <p>${task.title}</p>
                    <span>${new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

async function loadUpcomingDeadlines() {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks?sort=deadline`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const tasks = await response.json();
        const deadlinesContainer = document.getElementById('upcoming-deadlines');
        deadlinesContainer.innerHTML = tasks.slice(0, 5).map(task => `
            <div class="deadline-item">
                <i class="fas fa-clock"></i>
                <div class="deadline-details">
                    <p>${task.title}</p>
                    <span>Due: ${new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading deadlines:', error);
    }
}

// Event Listeners
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const { user, token } = await login(email, password);
        localStorage.setItem('token', token);
        currentUser = user;
        updateAuthDisplay(user);
    } catch (error) {
        alert(error.message);
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;
        const { user, token } = await register(name, email, password, role);
        localStorage.setItem('token', token);
        currentUser = user;
        updateAuthDisplay(user);
    } catch (error) {
        alert(error.message);
    }
});

showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm('register');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm('login');
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthDisplay(null);
});

sidebarMenu.addEventListener('click', (e) => {
    const menuItem = e.target.closest('li');
    if (!menuItem) return;

    // Remove active class from all items
    sidebarMenu.querySelectorAll('li').forEach(item => item.classList.remove('active'));
    
    // Add active class to clicked item
    menuItem.classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const sectionId = menuItem.dataset.section;
    document.getElementById(sectionId).style.display = 'block';
    currentSection = sectionId;
});

// Modal Event Handlers
document.querySelectorAll('.modal .close, .btn-secondary').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    });
});

// Project Modal Handlers
document.getElementById('add-project-btn')?.addEventListener('click', () => {
    document.getElementById('project-modal').style.display = 'block';
});

// Task Modal Handlers
document.getElementById('add-task-btn')?.addEventListener('click', () => {
    document.getElementById('task-modal').style.display = 'block';
});

// Document Modal Handlers
document.getElementById('add-document-btn')?.addEventListener('click', () => {
    document.getElementById('document-modal').style.display = 'block';
});

// Team Invite Modal Handlers
document.getElementById('invite-team-btn')?.addEventListener('click', () => {
    document.getElementById('invite-modal').style.display = 'block';
});

// Initialize
const token = localStorage.getItem('token');
if (token) {
    fetch(`${API_BASE_URL}/auth/verify`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.user) {
            currentUser = data.user;
            updateAuthDisplay(data.user);
        } else {
            localStorage.removeItem('token');
        }
    })
    .catch(() => {
        localStorage.removeItem('token');
    });
}