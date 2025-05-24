const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/remotecollaboration')
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err);
  });

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['developer', 'designer', 'project-manager', 'tester'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role
        });

        // Save user to database
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            'bda@1234', // Replace with a secure secret key
            { expiresIn: '24h' }
        );

        // Return user data and token
        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            'bda@1234', // Replace with a secure secret key
            { expiresIn: '24h' }
        );

        // Return user data and token
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, 'bda@1234'); // Use the same secret key as login
        req.user = verified;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

// Protected routes middleware
// Replace the existing authenticateToken middleware with this new one
app.use(['/api/projects', '/api/tasks', '/api/documents', '/api/team'], validateToken);

// Project Schema
// Update Project Schema in server.js
const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(date) {
                return date instanceof Date && !isNaN(date);
            },
            message: 'Start date must be a valid date'
        }
    },
    endDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(date) {
                return date instanceof Date && !isNaN(date) && 
                       (!this.startDate || date >= this.startDate);
            },
            message: 'End date must be a valid date and after or equal to start date'
        }
    },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed', 'On Hold'],
        default: 'Not Started'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true  // This ensures createdAt can never be changed
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });  // This automatically handles updatedAt



// Document Schema
const documentSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }
});

// Task Schema
const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed'],
        default: 'Not Started'
    },
    priority: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        default: 'Medium'
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    }
});

const Task = mongoose.model('Task', taskSchema);
const Document = mongoose.model('Document', documentSchema);
const Project = mongoose.model('Project', projectSchema);


// Project endpoints
// Add this enhanced token validation middleware
function validateToken() {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            reject(new Error('No token available'));
            return;
        }

        fetch(`${API_ENDPOINTS.USERS}/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Token validation failed');
        })
        .then(data => {
            if (data.success) {
                resolve(token);
            } else {
                throw new Error(data.message || 'Token validation failed');
            }
        })
        .catch(error => {
            console.error('Token validation error:', error);
            reject(error);
        });
    });
}


// Project creation endpoint with enhanced validation and error handling
app.post('/api/projects', validateToken, async (req, res) => {
    try {
        const { name, description, startDate, endDate, status } = req.body;

        // Enhanced input validation
        if (!name || !description || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                details: {
                    name: !name ? 'Name is required' : null,
                    description: !description ? 'Description is required' : null,
                    startDate: !startDate ? 'Start date is required' : null,
                    endDate: !endDate ? 'End date is required' : null
                }
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format',
                details: {
                    startDate: isNaN(start.getTime()) ? 'Invalid start date' : null,
                    endDate: isNaN(end.getTime()) ? 'Invalid end date' : null
                }
            });
        }

        if (end < start) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Create new project with validated data
        const project = new Project({
            name: name.trim(),
            description: description.trim(),
            owner: req.user.userId,  // Set from validated token
            startDate: start,
            endDate: end,
            status: status || 'Not Started'
            //team: [req.user.userId]  // Add creator to team
        });

        // Validate against schema
        const validationError = project.validateSync();
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: 'Project validation failed',
                errors: validationError.errors
            });
        }

        // Save project
        const savedProject = await project.save();

        // Populate owner and team details
        await savedProject.populate('owner', 'name email');
        await savedProject.populate('team', 'name email');

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            project: savedProject
        });

    } catch (error) {
        console.error('Project creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating project',
            error: error.message
        });
    }
});

// Task endpoints
app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { title, description, assignedTo, dueDate, priority, projectId } = req.body;
        const task = new Task({
            title,
            description,
            assignedTo,
            dueDate,
            priority,
            projectId
        });
        await task.save();
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error creating task', error: error.message });
    }
});

// Document endpoints
app.post('/api/documents', authenticateToken, async (req, res) => {
    try {
        const { fileName, fileType, taskId } = req.body;
        const document = new Document({
            fileName,
            fileType,
            taskId
        });
        await document.save();
        res.status(201).json(document);
    } catch (error) {
        res.status(500).json({ message: 'Error uploading document', error: error.message });
    }
});

// GET endpoints for retrieving data
app.get('/api/projects', authenticateToken, async (req, res) => {
    try {
        const projects = await Project.find().populate('owner', 'name email');
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving projects', error: error.message });
    }
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate('assignedTo', 'name email')
            .populate('projectId', 'name');
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving tasks', error: error.message });
    }
});

app.get('/api/documents', authenticateToken, async (req, res) => {
    try {
        const documents = await Document.find().populate('taskId', 'title');
        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving documents', error: error.message });
    }
});
app.get('/api/users/names', authenticateToken, async (req, res) => {
    try {
        // Find all users but exclude password field
        const users = await User
            .find({})
            .project({ name: 1 }) // Include only 'name' field
            .toArray();

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Add this to your server.js file
app.post('/api/auth/refresh', authenticateToken, async (req, res) => {
    try {
        // Get user data from token
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate new token
        const newToken = jwt.sign(
            { userId: user._id },
            'bda@1234', // Use the same secret key as login/register
            { expiresIn: '24h' }
        );

        res.json({
            token: newToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ message: 'Error refreshing token', error: error.message });
    }
});
// Apply to specific routes
// Replace your existing /api/users/me endpoint with this updated version
app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
        // Find user by ID and exclude password
        const user = await User.findById(req.user.userId)
            .select('-password')
            .populate('role');  // If you want to populate role information

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Get user's projects if they exist
        const userProjects = await Project.find({ 
            $or: [
                { owner: user._id },
                { team: user._id }
            ]
        }).select('name status');

        // Get user's assigned tasks
        const userTasks = await Task.find({ 
            assignedTo: user._id 
        }).select('title status dueDate');

        // Return comprehensive user data
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                projects: userProjects || [],
                tasks: userTasks || [],
                lastActive: new Date(),
                settings: user.settings || {} // If you have user settings
            },
            meta: {
                projectCount: userProjects ? userProjects.length : 0,
                taskCount: userTasks ? userTasks.length : 0,
                lastChecked: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error in /api/users/me:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error retrieving user data',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});