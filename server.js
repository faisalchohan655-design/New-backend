import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import scrapeRoutes from './routes/scrape.js';
import leadsRoutes from './routes/leads.js';
import facebookRoutes from './routes/facebook.js';
import emailRoutes from './routes/email.js';

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
app.use('/api', leadsRoutes);
app.use('/api', facebookRoutes);
app.use('/api/email', emailRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'LeadStriker API is running', status: 'ok' });
});

mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LeadStriker backend on port ${PORT}`);
});
