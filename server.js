const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const joi = require('joi');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Create an Express application
const app = express()

// Set the port number
const port = 3000

//json middleware
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/CRUD3');
mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
    console.error('Error connecting to MongoDB:', err);
});

//user schema
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});

//profile schema
const profileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    address: String,
    phone: String,
    city: String,
    country: String
});

//channel schema
const channelSchema = new mongoose.Schema({
    name: String,
    description: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    channelBio: String
});

//article schema
const articleSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
    title: String,
    link: String,
    description: String
});

//category schema
const categorySchema = new mongoose.Schema({
    name: String,
    description: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

//category-channel schema
const CategoryChannelSchema = new mongoose.Schema({
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }, 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// mongoDB models
const User = mongoose.model('User', userSchema);
const Profile = mongoose.model('Profile', profileSchema);
const Channel = mongoose.model('Channel', channelSchema);
const Article = mongoose.model('Article', articleSchema);
const Category = mongoose.model('Category', categorySchema);
const CategoryChannel = mongoose.model('CategoryChannel', CategoryChannelSchema);

// Registration validation 
const userSchemaValidation = joi.object({
    name: joi.string().min(3).max(30)
        .message({"string.empty": "Name is required", "any.required": "Name is required"}).required(),
    email: joi.string().email()
        .message({"string.email": "Please enter a valid email", "any.required": "Email is required"}).required(),
    password: joi.string().min(8)
        .message({"string.min": "Password must be at least 8 characters long", 
            "any.required": "Password is required"}).required(),
    address: joi.string().min(3).max(100).required(),
    phone: joi.string().min(10).max(15).required(),
    city: joi.string().min(2).max(50).required(),
    country: joi.string().min(2).max(50).required()
});

// Login validation
const loginSchemaValidation = joi.object({
    email: joi.string().email()
        .message({"string.email": "Please enter a valid email", "any.required": "Email is required"}).required(),
    password: joi.string().min(8)
        .message({"string.min": "Password must be at least 8 characters long", 
                   "any.required": "Password is required"}).required()
});

// Profile validation
const profileSchemaValidation = joi.object({
    address: joi.string().min(3).max(100).message({"string.empty":"Address is required",
         "any.required":"Address is required"}).required(),
    phone: joi.string().min(10).max(15).message({"string.pattern.base":"Phone must be 10-15",
         "any.required":"Phone is required"}).required(),
    city: joi.string().min(2).max(50).message({"string.empty":"City is required",
         "any.required":"City is required"}).required(),
    country: joi.string().min(2).max(50).message({"string.empty":"Country is required",
         "any.required":"Country is required"}).required()
});

// Channel validation
const channelSchemaValidation = joi.object({
    name: joi.string().min(3).max(50).message({"string.empty":"Channel name is required",
            "any.required":"Channel name is required"}).required(),
    description: joi.string().min(10).max(200).message({"string.empty":"Channel description is required",
            "any.required":"Channel description is required"}).required(),
    channelBio: joi.string().min(10).max(200).message({"string.empty":"Channel bio is required",
            "any.required":"Channel bio is required"}).required()
});

// Article validation
const articleSchemaValidation = joi.object({
    channel: joi.string().required().messages({
        "any.required": "Channel is required",
        "string.empty": "Channel is required"
    }),
    title: joi.string().min(3).max(100).required().messages({
        "string.empty": "Article title is required",
        "any.required": "Article title is required"
    }),
    link: joi.string().uri().required().messages({
        "string.uri": "Please enter a valid URL",
        "any.required": "Article link is required"
    }),
    description: joi.string().min(10).max(500).required().messages({
        "string.empty": "Article description is required",
        "any.required": "Article description is required"
    })
});

// category validation
const categorySchemaValidation = joi.object({
    name: joi.string().min(3).max(50).message({"string.empty":"Category name is required",
          "any.required":"Category name is required"}).required(),
    description: joi.string().min(10).max(200).message({"string.empty":"Category description is required",
          "any.required":"Category description is required"}).required()
});

// CategoryChannel validation
const categoryChannelSchemaValidation = joi.object({
    category: joi.string().required(),
    channel: joi.string().required()
});

// Authentication middleware
const authMiddleware = async (req, res, next) => {
try {
// Check for the presence of the authorization header 
    const header = req.headers['authorization'];
if (!header) {
    return res.status(401).json({ message: 'Authorization header is missing' });
}
// Extract the token from the authorization header 
const token = header && header.split(' ')[1];
if (!token) {
    return res.status(401).json({ message: 'Token is missing' });
}
// Verify the token and decode it
const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
if (!decodedToken) {
    return res.status(401).json({ message: 'Invalid token' });
}
// Find the user associated with the decoded token
const user = await User.findById(decodedToken.userId);
if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
}
// Attach the user object to the request for further use
req.user = user;
next();
} catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Invalid token' });
}
};

// Registration API
app.post('/register', async (req, res) => {
    try {
        const { error } = userSchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { name, email, password, address, phone, city, country } = req.body;

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create a new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        let profile;
        try {
            profile = await Profile.create({
                user: newUser._id,
                address,
                phone,
                city,
                country
            });
        } catch (profileError) {
            await User.findByIdAndDelete(newUser._id);
            throw profileError;
        }
        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        return res.status(201).json({ message: 'User and profile registered successfully', token, profile });
    } catch (err) {
        console.error("Registration error:", err);
        return res.status(500).json({ message: 'Registration failed', error: err.message });
    }
});

// Login API
app.post('/login', async (req, res) => {
    try {
        const { error } = loginSchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const { email, password } = req.body;
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        return res.status(200).json({ message: 'Login successfully', token });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Login failed' });
    }
});

// user APIs
// Get current logged-in user   
app.get('/users/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        return res.status(200).json({ user });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch user' });
    }
});

// Get all users (authenticated users)
app.get('/users', authMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        return res.status(200).json({ count: users.length, users });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// Get user by ID
app.get('/users/:id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json({ user });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch user' });
    }
});

// Update the current user
app.put('/users/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { name, email } = req.body;
        const updateData = { name, email };

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

          if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json({ message: 'User updated successfully', user });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to update user' });
    }
});

// Delete the current user
app.delete('/users/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to delete user' });
    }
});

// Profile APIs
// Create profile
app.post('/profile', authMiddleware, async (req, res) => {
    try {
        const { error } = profileSchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { address, phone, city, country } = req.body;

         // Prevent duplicate profiles for same user
        const existingProfile = await Profile.findOne({ user: req.user._id });
        if (existingProfile) {
            return res.status(400).json({ message: 'Profile already exists for this user' });
        }

        const profile = new Profile({
            user: req.user._id,
            address, phone, city, country
        });
        await profile.save();
        return res.status(201).json({ message: 'Profile created successfully', profile });
    } catch (err) {
        console.error("Profile creation error:", err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});

// Get my profile
app.get('/profile/me', authMiddleware, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user._id }).populate('user', '-password');
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        return res.status(200).json({ profile });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch profile' });
    }
});

// Get all profiles (authenticated users)
app.get('/profiles', authMiddleware, async (req, res) => {
    try {
        const profiles = await Profile.find({ user: req.user._id }).populate('user', '-password');
        return res.status(200).json({ count: profiles.length, profiles });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch profiles' });
    }
});

// Update my profile
app.put('/profile/:id', authMiddleware, async (req, res) => {
    try {
        const { error } = profileSchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const profile = await Profile.findById(req.params.id);
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        if (profile.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updated = await Profile.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        return res.status(200).json({ message: 'Profile updated successfully', profile: updated });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to update profile' });
    }
});

// Delete my profile
app.delete('/profile/:id', authMiddleware, async (req, res) => {
    try {
        const profile = await Profile.findById(req.params.id);
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        if (profile.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Profile.findByIdAndDelete(req.params.id);
        return res.status(200).json({ message: 'Profile deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to delete profile' });
    }
});

// Channel APIs
// Create channel
app.post('/channels', authMiddleware, async (req, res) => {
    try {
        const { error } = channelSchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { name, description, channelBio } = req.body;
        const channel = new Channel({
            name, description, channelBio,
            user: req.user._id
        });
        await channel.save();
        return res.status(201).json({ message: 'Channel created successfully', channel });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to create channel' });
    }
});

// Get my channels
app.get('/channels', authMiddleware, async (req, res) => {
    try {
        const channels = await Channel.find({ user: req.user._id }).populate('user', 'name email');
        return res.status(200).json({ count: channels.length, channels });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch channels' });
    }
});

// Get channel by ID (public)
app.get('/channels/:id', async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.id).populate('user', 'name email');
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }
        return res.status(200).json({ channel });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch channel' });
    }
});

// Update channel (owner only)
app.put('/channels/:id', authMiddleware, async (req, res) => {
    try {
        const { error } = channelSchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const channel = await Channel.findById(req.params.id);
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }
         if (channel.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updated = await Channel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        return res.status(200).json({ message: 'Channel updated successfully', channel: updated });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to update channel' });
    }
});

// Delete channel (owner only)
app.delete('/channels/:id', authMiddleware, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.id);
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        if (channel.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

          await Channel.findByIdAndDelete(req.params.id);
        return res.status(200).json({ message: 'Channel deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to delete channel' });
    }
});

// Article APIs
// // Create article
app.post('/articles', authMiddleware, async (req, res) => {
    try {
        const { error } = articleSchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { channel, title, link, description } = req.body;

         // Verify channel exists
        const existingChannel = await Channel.findOne({ _id: channel, user: req.user._id });
        if (!existingChannel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        const article = new Article({
            user: req.user._id,
            channel, title, link, description
        });
        await article.save();
        return res.status(201).json({ message: 'Article created successfully', article });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to create article' });
    }
});

// Get my articles
app.get('/articles', authMiddleware, async (req, res) => {
    try {
        const articles = await Article.find({ user: req.user._id })
            .populate('user', 'name email')
            .populate('channel', 'name');
        return res.status(200).json({ count: articles.length, articles });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch articles' });
    }
});

// Get my article by ID
app.get('/articles/:id', authMiddleware, async (req, res) => {
    try {
        const article = await Article.findOne({ _id: req.params.id, user: req.user._id })
            .populate('user', 'name email')
            .populate('channel', 'name');
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }
        return res.status(200).json({ article });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch article' });
    }
    });

// Update article (owner only)
app.put('/articles/:id', authMiddleware, async (req, res) => {
    try {
        const { error } = articleSchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }
         if (article.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updated = await Article.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        return res.status(200).json({ message: 'Article updated successfully', article: updated });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to update article' });
    }
});

// Delete article (owner only)
app.delete('/articles/:id', authMiddleware, async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        if (article.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Article.findByIdAndDelete(req.params.id);
        return res.status(200).json({ message: 'Article deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to delete article' });
    }
});

// Category APIs
// Create category (authenticated users)
app.post('/categories', authMiddleware, async (req, res) => {
    try {
        const { error } = categorySchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { name, description } = req.body;
        const category = new Category({ name, description, user: req.user._id });
        await category.save();
        return res.status(201).json({ message: 'Category created successfully', category });
    } catch (err) {
        console.error(err);
         return res.status(500).json({ message: 'Failed to create category' });
    }
});

// Get my categories
app.get('/categories', authMiddleware, async (req, res) => {
    try {
        const categories = await Category.find({ user: req.user._id });
        return res.status(200).json({ count: categories.length, categories });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch categories' });
    }
});

// Get my category by ID
app.get('/categories/:id', authMiddleware, async (req, res) => {
    try {
        const category = await Category.findOne({ _id: req.params.id, user: req.user._id });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        return res.status(200).json({ category });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch category' });
    }
});

// Update category (authenticated users)
app.put('/categories/:id', authMiddleware, async (req, res) => {
    try {
        const { error } = categorySchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const category = await Category.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { name: req.body.name, description: req.body.description },
            { new: true, runValidators: true }
        );
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        return res.status(200).json({ message: 'Category updated successfully', category });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to update category' });
    }
});

// Delete category (authenticated users)
app.delete('/categories/:id', authMiddleware, async (req, res) => {
    try {
        const category = await Category.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        return res.status(200).json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to delete category' });
    }
});

// CategoryChannel APIs
// Link a channel to a category
app.post('/category-channels', authMiddleware, async (req, res) => {
    try {
        const { error } = categoryChannelSchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { category, channel } = req.body;

         // Verify both exist
        const [catExists, chanExists] = await Promise.all([
            Category.findOne({ _id: category, user: req.user._id }),
            Channel.findOne({ _id: channel, user: req.user._id })
        ]);
        if (!catExists) return res.status(404).json({ message: 'Category not found' });
        if (!chanExists) return res.status(404).json({ message: 'Channel not found' });

          // Prevent duplicate link
        const existing = await CategoryChannel.findOne({ category, channel });
        if (existing) {
            return res.status(400).json({ message: 'Channel already linked to this category' });
        }

        const link = new CategoryChannel({
            category, channel,
            user: req.user._id
        });
                await link.save();
        return res.status(201).json({ message: 'Channel linked to category successfully', link });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to link channel to category' });
    }
});

// Get all links (authenticated users)
app.get('/category-channels', authMiddleware, async (req, res) => {
    try {
        const links = await CategoryChannel.find({ user: req.user._id })
            .populate('category', 'name')
            .populate('channel', 'name')
            .populate('user', 'name email');
        return res.status(200).json({ count: links.length, links });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch links' });
    }
});

// Get channels by category (public)
app.get('/category-channels/category/:categoryId', async (req, res) => {
    try {
        const links = await CategoryChannel.find({ category: req.params.categoryId })
            .populate('channel', 'name description');
        return res.status(200).json({ count: links.length, links });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch channels' });
    }
});

// Unlink (delete) — owner only
app.delete('/category-channels/:id', authMiddleware, async (req, res) => {
    try {
        const link = await CategoryChannel.findById(req.params.id);
        if (!link) {
            return res.status(404).json({ message: 'Link not found' });
        }

        if (link.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

         await CategoryChannel.findByIdAndDelete(req.params.id);
        return res.status(200).json({ message: 'Link removed successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to remove link' });
    }
});

// Serve the built React app from the same origin in production.
const frontendPath = path.join(__dirname, 'my-react-app', 'dist');
app.use(express.static(frontendPath));
app.get('/', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
});
app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html')) {
        return res.sendFile(path.join(frontendPath, 'index.html'));
    }
    next();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})