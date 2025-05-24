const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/teamcollab', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Models
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    tasksCount: { type: Number, default: 0 }
});

const projectSchema = new mongoose.Schema({
    name: String,
    description: String,
    startDate: Date,
    endDate: Date,
    status: String,
    team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    tasksCount: { type: Number, default: 0 }
});

const taskSchema = new mongoose.Schema({
    title: String,
    description: String,
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: String,
    priority: String,
    dueDate: Date
});

const documentSchema = new mongoose.Schema({
    title: String,
    description: String,
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    type: String,
    url: String
});

const activitySchema = new mongoose.Schema({
    type: String,
    description: String,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);
const Document = mongoose.model('Document', documentSchema);
const Activity = mongoose.model('Activity', activitySchema);

// Authentication Middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            throw new Error();
        }
        
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

// Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 8);
        
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role
        });
        
        await user.save();
        
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key'
        );
        
        res.status(201).send({ user, token });
    } catch (error) {
        res.status(400).send(error);
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new Error('Invalid login credentials');
        }
        
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key'
        );
        
        res.send({ user, token });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.post('/api/auth/logout', auth, (req, res) => {
    res.send({ message: 'Logged out successfully' });
});

// Project Routes
app.get('/api/projects', auth, async (req, res) => {
    try {
        const projects = await Project.find().populate('team');
        res.send(projects);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post('/api/projects', auth, async (req, res) => {
    try {
        const project = new Project(req.body);
        await project.save();
        res.status(201).send(project);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Task Routes
app.get('/api/tasks', auth, async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate('projectId')
            .populate('assigneeId');
        res.send(tasks);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post('/api/tasks', auth, async (req, res) => {
    try {
        const task = new Task(req.body);
        await task.save();
        
        // Update project and user task counts
        await Project.findByIdAndUpdate(task.projectId, { $inc: { tasksCount: 1 } });
        await User.findByIdAndUpdate(task.assigneeId, { $inc: { tasksCount: 1 } });
        
        res.status(201).send(task);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Document Routes
app.get('/api/documents', auth, async (req, res) => {
    try {
        const documents = await Document.find()
            .populate('projectId');
        res.send(documents);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post('/api/documents', auth, async (req, res) => {
    try {
        const document = new Document(req.body);
        await document.save();
        res.status(201).send(document);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Statistics Routes
app.get('/api/projects/count', auth, async (req, res) => {
    try {
        const count = await Project.countDocuments();
        res.send({ count });
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/api/tasks/count', auth, async (req, res) => {
    try {
        const count = await Task.countDocuments();
        res.send({ count });
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/api/documents/count', auth, async (req, res) => {
    try {
        const count = await Document.countDocuments();
        res.send({ count });
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/api/users/count', auth, async (req, res) => {
    try {
        const count = await User.countDocuments();
        res.send({ count });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Server initialization
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});