// TeamCollab2 - Remote Team Collaboration App
// JavaScript functionality for the frontend
// Connects to MongoDB via a backend API

// Global variables
let currentUser = null;
let projects = [];
let tasks = [];
let documents = [];
let users = [];
let activities = [];

// API endpoints - replace with your actual backend URLs
const API_BASE_URL = 'https://api.teamcollab2.com/api';
const API_ENDPOINTS = {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    USERS: `${API_BASE_URL}/users`,
    PROJECTS: `${API_BASE_URL}/projects`,
    TASKS: `${API_BASE_URL}/tasks`,
    DOCUMENTS: `${API_BASE_URL}/documents`,
    ACTIVITIES: `${API_BASE_URL}/activities`,
    INVITATIONS: `${API_BASE_URL}/invitations`
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in (from session/localStorage)
    checkAuthStatus();
    
    // Setup event listeners
    setupEventListeners();
});

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Validate token with backend
        fetch(API_ENDPOINTS.USERS + '/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Invalid token');
            }
        })
        .then(userData => {
            currentUser = userData;
            showLoggedInState();
            loadDashboardData();
        })
        .catch(error => {
            console.error('Auth validation error:', error);
            localStorage.removeItem('authToken');
            showAuthSection();
        });
    } else {
        showAuthSection();
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Update active state
            document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Auth form toggling
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForms();
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForms();
    });

    // Login form submission
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Register form submission
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Project modal events
    document.getElementById('add-project-btn').addEventListener('click', () => openProjectModal());
    document.getElementById('cancel-project').addEventListener('click', () => closeModal('project-modal'));
    document.getElementById('project-form').addEventListener('submit', handleProjectSubmit);

    // Task modal events
    document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal());
    document.getElementById('cancel-task').addEventListener('click', () => closeModal('task-modal'));
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);

    // Document modal events
    document.getElementById('add-document-btn').addEventListener('click', () => openDocumentModal());
    document.getElementById('cancel-document').addEventListener('click', () => closeModal('document-modal'));
    document.getElementById('document-form').addEventListener('submit', handleDocumentSubmit);

    // Team modal events
    document.getElementById('invite-team-btn').addEventListener('click', () => openInviteModal());
    document.getElementById('cancel-invite').addEventListener('click', () => closeModal('invite-modal'));
    document.getElementById('invite-form').addEventListener('submit', handleInviteSubmit);

    // Search and filter events
    document.getElementById('project-search').addEventListener('input', filterProjects);
    document.getElementById('project-status-filter').addEventListener('change', filterProjects);
    
    document.getElementById('task-search').addEventListener('input', filterTasks);
    document.getElementById('task-project-filter').addEventListener('change', filterTasks);
    document.getElementById('task-status-filter').addEventListener('change', filterTasks);
    
    document.getElementById('document-search').addEventListener('input', filterDocuments);
    document.getElementById('document-project-filter').addEventListener('change', filterDocuments);
    document.getElementById('document-type-filter').addEventListener('change', filterDocuments);
    
    document.getElementById('team-search').addEventListener('input', filterTeamMembers);
    document.getElementById('team-role-filter').addEventListener('change', filterTeamMembers);

    // Close modals with X button
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// AUTHENTICATION FUNCTIONS

// Toggle between login and register forms
function toggleAuthForms() {
    const authForms = document.querySelectorAll('.auth-form');
    authForms.forEach(form => {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
}

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => {
        if (response.ok) return response.json();
        throw new Error('Login failed');
    })
    .then(data => {
        // Store auth token
        localStorage.setItem('authToken', data.token);
        currentUser = data.user;
        
        // Update UI
        showLoggedInState();
        loadDashboardData();
        
        // Log activity
        logActivity('User login', 'login');
    })
    .catch(error => {
        console.error('Login error:', error);
        alert('Login failed. Please check your credentials.');
    });
}

// Handle register form submission
function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    
    fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, role })
    })
    .then(response => {
        if (response.ok) return response.json();
        throw new Error('Registration failed');
    })
    .then(data => {
        // Store auth token
        localStorage.setItem('authToken', data.token);
        currentUser = data.user;
        
        // Update UI
        showLoggedInState();
        loadDashboardData();
        
        // Log activity
        logActivity('User registration', 'register');
    })
    .catch(error => {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    });
}

// Handle logout
function handleLogout() {
    // Call logout endpoint to invalidate token on server
    fetch(API_ENDPOINTS.LOGOUT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    })
    .then(() => {
        // Clear local storage and session data
        localStorage.removeItem('authToken');
        currentUser = null;
        
        // Reset UI
        document.getElementById('current-user-name').textContent = 'Not logged in';
        document.getElementById('login-btn').style.display = 'block';
        document.getElementById('logout-btn').style.display = 'none';
        
        showAuthSection();
    })
    .catch(error => {
        console.error('Logout error:', error);
    });
}

// UI STATE MANAGEMENT

// Show the auth section
function showAuthSection() {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show auth section
    document.getElementById('auth-section').style.display = 'flex';
}

// Show logged in state
function showLoggedInState() {
    // Update user info
    document.getElementById('current-user-name').textContent = currentUser.name;
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'block';
    
    // Show dashboard as default section
    showSection('dashboard');
}

// Show specific section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionId).style.display = 'block';
    
    // Load section data if needed
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'documents':
            loadDocuments();
            break;
        case 'team':
            loadTeamMembers();
            break;
    }
}

// DATA LOADING FUNCTIONS

// Load dashboard data
function loadDashboardData() {
    // Get counts and summaries
    Promise.all([
        fetch(`${API_ENDPOINTS.PROJECTS}/count`, getAuthHeader()),
        fetch(`${API_ENDPOINTS.TASKS}/count`, getAuthHeader()),
        fetch(`${API_ENDPOINTS.DOCUMENTS}/count`, getAuthHeader()),
        fetch(`${API_ENDPOINTS.USERS}/count`, getAuthHeader()),
        fetch(`${API_ENDPOINTS.ACTIVITIES}/recent`, getAuthHeader()),
        fetch(`${API_ENDPOINTS.TASKS}/upcoming-deadlines`, getAuthHeader())
    ])
    .then(responses => Promise.all(responses.map(res => res.json())))
    .then(([projectsCount, tasksCount, docsCount, usersCount, recentActivities, upcomingDeadlines]) => {
        // Update stats
        document.getElementById('projects-count').textContent = projectsCount.count;
        document.getElementById('tasks-count').textContent = tasksCount.count;
        document.getElementById('docs-count').textContent = docsCount.count;
        document.getElementById('users-count').textContent = usersCount.count;
        
        // Update activities
        activities = recentActivities;
        renderActivities();
        
        // Update deadlines
        renderDeadlines(upcomingDeadlines);
    })
    .catch(error => {
        console.error('Error loading dashboard data:', error);
    });
}

// Load projects data
function loadProjects() {
    fetch(API_ENDPOINTS.PROJECTS, getAuthHeader())
        .then(response => response.json())
        .then(data => {
            projects = data;
            renderProjects();
            updateProjectDropdowns();
        })
        .catch(error => {
            console.error('Error loading projects:', error);
        });
}

// Load tasks data
function loadTasks() {
    Promise.all([
        fetch(API_ENDPOINTS.TASKS, getAuthHeader()),
        fetch(API_ENDPOINTS.PROJECTS, getAuthHeader())
    ])
    .then(responses => Promise.all(responses.map(res => res.json())))
    .then(([tasksData, projectsData]) => {
        tasks = tasksData;
        projects = projectsData;
        
        renderTasks();
        updateProjectDropdowns();
        updateTaskProjectFilter();
    })
    .catch(error => {
        console.error('Error loading tasks data:', error);
    });
}

// Load documents data
function loadDocuments() {
    Promise.all([
        fetch(API_ENDPOINTS.DOCUMENTS, getAuthHeader()),
        fetch(API_ENDPOINTS.PROJECTS, getAuthHeader())
    ])
    .then(responses => Promise.all(responses.map(res => res.json())))
    .then(([documentsData, projectsData]) => {
        documents = documentsData;
        projects = projectsData;
        
        renderDocuments();
        updateProjectDropdowns();
        updateDocumentProjectFilter();
    })
    .catch(error => {
        console.error('Error loading documents data:', error);
    });
}

// Load team members data
function loadTeamMembers() {
    Promise.all([
        fetch(API_ENDPOINTS.USERS, getAuthHeader()),
        fetch(API_ENDPOINTS.PROJECTS, getAuthHeader())
    ])
    .then(responses => Promise.all(responses.map(res => res.json())))
    .then(([usersData, projectsData]) => {
        users = usersData;
        projects = projectsData;
        
        renderTeamMembers();
        updateProjectDropdowns();
    })
    .catch(error => {
        console.error('Error loading team data:', error);
    });
}

// RENDERING FUNCTIONS

// Render recent activities
function renderActivities() {
    const container = document.getElementById('recent-activities');
    container.innerHTML = '';
    
    if (activities.length === 0) {
        container.innerHTML = '<p>No recent activities.</p>';
        return;
    }
    
    activities.forEach(activity => {
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        
        // Set icon background based on activity type
        let iconClass = 'fas fa-info-circle';
        let iconBg = 'var(--info-color)';
        
        switch(activity.type) {
            case 'project':
                iconClass = 'fas fa-project-diagram';
                iconBg = 'var(--primary-color)';
                break;
            case 'task':
                iconClass = 'fas fa-tasks';
                iconBg = 'var(--warning-color)';
                break;
            case 'document':
                iconClass = 'fas fa-file-alt';
                iconBg = 'var(--success-color)';
                break;
            case 'user':
                iconClass = 'fas fa-user';
                iconBg = 'var(--secondary-color)';
                break;
        }
        
        activityElement.innerHTML = `
            <div class="activity-icon" style="background-color: ${iconBg};">
                <i class="${iconClass}"></i>
            </div>
            <div class="activity-content">
                <p>${activity.description}</p>
                <span class="activity-time">${formatTimeAgo(new Date(activity.timestamp))}</span>
            </div>
        `;
        
        container.appendChild(activityElement);
    });
}

// Render upcoming deadlines
function renderDeadlines(deadlines) {
    const container = document.getElementById('upcoming-deadlines');
    container.innerHTML = '';
    
    if (deadlines.length === 0) {
        container.innerHTML = '<p>No upcoming deadlines.</p>';
        return;
    }
    
    deadlines.forEach(deadline => {
        const daysRemaining = calculateDaysRemaining(new Date(deadline.dueDate));
        let iconBg = 'var(--info-color)'; // Default blue
        
        // Change color based on urgency
        if (daysRemaining <= 1) {
            iconBg = 'var(--danger-color)'; // Red for urgent
        } else if (daysRemaining <= 3) {
            iconBg = 'var(--warning-color)'; // Yellow for approaching
        }
        
        const deadlineElement = document.createElement('div');
        deadlineElement.className = 'deadline-item';
        deadlineElement.innerHTML = `
            <div class="deadline-icon" style="background-color: ${iconBg};">
                <i class="fas fa-calendar-day"></i>
            </div>
            <div class="deadline-content">
                <p>${deadline.title}</p>
                <span class="deadline-date">${formatDate(new Date(deadline.dueDate))} (${daysRemaining} days remaining)</span>
            </div>
        `;
        
        container.appendChild(deadlineElement);
    });
}

// Render projects
function renderProjects() {
    const container = document.getElementById('projects-container');
    container.innerHTML = '';
    
    if (projects.length === 0) {
        container.innerHTML = '<p>No projects found. Create your first project!</p>';
        return;
    }
    
    projects.forEach(project => {
        const projectElement = document.createElement('div');
        projectElement.className = 'project-card';
        projectElement.setAttribute('data-id', project._id);
        projectElement.onclick = () => openProjectDetails(project._id);
        
        // Calculate progress percentage
        const startDate = new Date(project.startDate);
        const endDate = new Date(project.endDate);
        const currentDate = new Date();
        const totalDuration = endDate - startDate;
        const elapsed = currentDate - startDate;
        const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
        
        // Format team members display
        const teamAvatars = project.team.slice(0, 3).map(member => {
            const initials = member.name.split(' ').map(n => n[0]).join('');
            return `<div class="team-avatar">${initials}</div>`;
        }).join('');
        
        const moreMembers = project.team.length > 3 ? 
            `<div class="team-avatar team-more">+${project.team.length - 3}</div>` : '';
        
        projectElement.innerHTML = `
            <div class="project-header">
                <div class="project-title">${project.name}</div>
                <div class="project-status status-${project.status}">${formatStatus(project.status)}</div>
            </div>
            <div class="project-content">
                <div class="project-description">${project.description}</div>
                <div class="project-info">
                    <div class="project-info-item">
                        <i class="fas fa-calendar-alt"></i>
                        ${formatDate(startDate)} - ${formatDate(endDate)}
                    </div>
                    <div class="project-info-item">
                        <i class="fas fa-tasks"></i>
                        ${project.tasksCount || 0} Tasks
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress" style="width: ${progress}%;"></div>
                </div>
                <div class="project-team">
                    <div class="team-label">Team</div>
                    <div class="team-avatars">
                        ${teamAvatars}
                        ${moreMembers}
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(projectElement);
    });
}

// Render tasks (Kanban board)
function renderTasks() {
    // Clear all task columns
    document.getElementById('todo-tasks').innerHTML = '';
    document.getElementById('progress-tasks').innerHTML = '';
    document.getElementById('review-tasks').innerHTML = '';
    document.getElementById('completed-tasks').innerHTML = '';
    
    if (tasks.length === 0) {
        const columns = ['todo-tasks', 'progress-tasks', 'review-tasks', 'completed-tasks'];
        columns.forEach(col => {
            document.getElementById(col).innerHTML = '<p class="empty-column">No tasks</p>';
        });
        return;
    }
    
    // Group tasks by status
    const tasksByStatus = {
        'todo': [],
        'in-progress': [],
        'review': [],
        'completed': []
    };
    
    tasks.forEach(task => {
        if (tasksByStatus[task.status]) {
            tasksByStatus[task.status].push(task);
        }
    });
    
    // Render each task in its appropriate column
    Object.keys(tasksByStatus).forEach(status => {
        const columnId = status === 'in-progress' ? 'progress-tasks' : `${status}-tasks`;
        const column = document.getElementById(columnId);
        
        tasksByStatus[status].forEach(task => {
            const taskProject = projects.find(p => p._id === task.projectId);
            const assignee = users.find(u => u._id === task.assigneeId);
            
            const taskElement = document.createElement('div');
            taskElement.className = 'task-card';
            taskElement.setAttribute('data-id', task._id);
            taskElement.setAttribute('draggable', 'true');
            taskElement.addEventListener('dragstart', handleDragStart);
            
            // Get initials for assignee avatar
            let assigneeInitials = '';
            if (assignee) {
                assigneeInitials = assignee.name.split(' ').map(n => n[0]).join('');
            }
            
            taskElement.innerHTML = `
                <div class="task-header">
                    <span class="task-priority priority-${task.priority}">${formatPriority(task.priority)}</span>
                    <span class="task-project"><i class="fas fa-project-diagram"></i> ${taskProject ? taskProject.name : 'N/A'}</span>
                </div>
                <h3 class="task-title">${task.title}</h3>
                <div class="task-description">${task.description}</div>
                <div class="task-meta">
                    <span class="task-due"><i class="fas fa-calendar-day"></i> ${formatDate(new Date(task.dueDate))}</span>
                </div>
                <div class="task-assignee">
                    <div class="assignee-avatar">${assigneeInitials}</div>
                    <span class="assignee-name">${assignee ? assignee.name : 'Unassigned'}</span>
                </div>
            `;
            
            column.appendChild(taskElement);
        });
        
        // If no tasks in this column
        if (tasksByStatus[status].length === 0) {
            column.innerHTML = '<p class="empty-column">No tasks</p>';
        }
    });
    
    // Setup drop zones for drag and drop
    setupDropZones();
}

// Render documents
function renderDocuments() {
    const container = document.getElementById('documents-container');
    container.innerHTML = '';
    
    if (documents.length === 0) {
        container.innerHTML = '<p>No documents found. Add your first document!</p>';
        return;
    }
    
    documents.forEach(doc => {
        const projectName = projects.find(p => p._id === doc.projectId)?.name || 'N/A';
        
        // Determine icon based on document type
        let icon = 'fas fa-file-alt';
        switch(doc.type) {
            case 'documentation':
                icon = 'fas fa-file-code';
                break;
            case 'report':
                icon = 'fas fa-file-chart-line';
                break;
            case 'design':
                icon = 'fas fa-file-image';
                break;
        }
        
        const documentElement = document.createElement('div');
        documentElement.className = 'document-card';
        documentElement.innerHTML = `
            <div class="document-icon">
                <i class="${icon}"></i>
            </div>
            <div class="document-content">
                <h3 class="document-title">${doc.title}</h3>
                <div class="document-description">${doc.description}</div>
                <div class="document-meta">
                    <span class="document-type"><i class="fas fa-file-alt"></i> ${formatDocType(doc.type)}</span>
                    <span class="document-project"><i class="fas fa-project-diagram"></i> ${projectName}</span>
                </div>
                <div class="document-actions">
                    <a href="${doc.url}" target="_blank"><i class="fas fa-external-link-alt"></i> Open</a>
                    <a href="#" class="edit-document" data-id="${doc._id}"><i class="fas fa-edit"></i> Edit</a>
                </div>
            </div>
        `;
        
        container.appendChild(documentElement);
        
        // Add event listener for edit button
        documentElement.querySelector('.edit-document').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openDocumentModal(doc._id);
        });
    });
}

// Render team members
function renderTeamMembers() {
    const container = document.getElementById('team-container');
    container.innerHTML = '';
    
    if (users.length === 0) {
        container.innerHTML = '<p>No team members found. Invite your first team member!</p>';
        return;
    }
    
    users.forEach(user => {
        // Get user's projects
        const userProjects = projects.filter(p => 
            p.team.some(member => member._id === user._id)
        );
        
        // Format project badges
        const projectBadges = userProjects.slice(0, 3).map(p => 
            `<div class="member-project-item">${p.name}</div>`
        ).join('');
        
        const moreProjects = userProjects.length > 3 ? 
            `<div class="member-project-item">+${userProjects.length - 3} more</div>` : '';
        
        // Get initials for avatar
        const initials = user.name.split(' ').map(n => n[0]).join('');
        
        const memberElement = document.createElement('div');
        memberElement.className = 'member-card';
        memberElement.setAttribute('data-id', user._id);
        memberElement.onclick = () => openMemberDetails(user._id);
        
        memberElement.innerHTML = `
            <div class="member-avatar">
                <div class="member-avatar-icon">${initials}</div>
            </div>
            <div class="member-content">
                <h3 class="member-name">${user.name}</h3>
                <div class="member-role"><i class="fas fa-briefcase"></i> ${formatRole(user.role)}</div>
                <div class="member-info">
                    <div class="member-info-item">
                        <i class="fas fa-envelope"></i> ${user.email}
                    </div>
                    <div class="member-info-item">
                        <i class="fas fa-project-diagram"></i> ${userProjects.length} Projects
                    </div>
                    <div class="member-info-item">
                        <i class="fas fa-tasks"></i> ${user.tasksCount || 0} Tasks Assigned
                    </div>
                </div>
                <div class="member-projects">
                    <div class="projects-label">Projects</div>
                    <div class="member-project-list">
                        ${projectBadges}
                        ${moreProjects}
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(memberElement);
    });
}

// MODAL HANDLING FUNCTIONS

// Open project modal (create or edit)
function openProjectModal(projectId = null) {
    const modal = document.getElementById('project-modal');
    const modalTitle = document.getElementById('project-modal-title');
    const form = document.getElementById('project-form');
    
    // Reset form
    form.reset();
    
    if (projectId) {
        // Edit existing project
        const project = projects.find(p => p._id === projectId);
        if (!project) return;
        
        modalTitle.textContent = 'Edit Project';
        document.getElementById('project-id').value = project._id;
        document.getElementById('project-name').value = project.name;
        document.getElementById('project-description').value = project.description;
        document.getElementById('project-start-date').value = formatDateForInput(new Date(project.startDate));
        document.getElementById('project-end-date').value = formatDateForInput(new Date(project.endDate));
        document.getElementById('project-status').value = project.status;
        
        // Set selected team members
        const teamSelect = document.getElementById('project-team');
        Array.from(teamSelect.options).forEach(option => {
            option.selected = project.team.some(member => member._id === option.value);
        });
    } else {
        // Create new project
        modalTitle.textContent = 'Add New Project';
        document.getElementById('project-id').value = '';
        
        // Set default dates to today and today + 1 month
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        document.getElementById('project-start-date').value = formatDateForInput(today);
        document.getElementById('project-end-date').value = formatDateForInput(nextMonth);
    }
    
    // Populate team members dropdown
    populateTeamMembersDropdown();
    
    // Show modal
    modal.style.display = 'block';
}

// Open task modal (create or edit)
function openTaskModal(taskId = null) {
    const modal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('task-modal-title');
    const form = document.getElementById('task-form');
    
    // Reset form
    form.reset();
    
    // Populate project dropdown
    populateProjectDropdown('task-project');
    
    // Populate assignee dropdown
    populateTeamMembersDropdown('task-assignee', false);
    
    if (taskId) {
        // Edit existing task
        const task = tasks.find(t => t._id === taskId);
        if (!task) return;
        
        modalTitle.textContent = 'Edit Task';
        document.getElementById('task-id').value = task._id;