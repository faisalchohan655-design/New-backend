import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Get user settings
export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('settings');
    res.json(user?.settings || { theme: 'purple', notifications: true, language: 'English', emailReports: 'Weekly' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user settings
export const updateSettings = async (req, res) => {
  try {
    const { theme, notifications, language, emailReports } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { settings: { theme, notifications, language, emailReports } },
      { new: true }
    );
    res.json(user.settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Signup
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    
    const user = new User({ name, email, password });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name, email, plan: user.plan } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email, plan: user.plan } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
