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

// CORS
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

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'LeadConnect API is running', status: 'ok' });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LeadConnect backend on port ${PORT}`);
});
