// backend/server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import scrapeRoutes from './routes/scrape.js';
import leadRoutes from './routes/leads.js';
import emailRoutes from './routes/email.js';
import socialRoutes from './routes/social.js';
import replyRoutes from './routes/replies.js';
import userRoutes from './routes/user.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api', scrapeRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/replies', replyRoutes);
app.use('/api/user', userRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'LeadConnect API is running', status: 'ok' });
});

// ============================================
// ✅ FIXED: MongoDB Connection with Check
// ============================================
const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
  console.error('❌ MONGODB_URL is not defined in environment variables!');
  console.error('Please set MONGODB_URL in .env file or Railway environment variables.');
  process.exit(1);
}

console.log('📡 Connecting to MongoDB...');

mongoose.connect(MONGODB_URL, {
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log('✅ MongoDB connected!'))
.catch(err => {
  console.error('❌ MongoDB error:', err.message);
  process.exit(1);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LeadConnect backend on port ${PORT}`);
});
