import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import scrapeRoutes from './routes/scrape.js';      // Google Maps Scraper
import leadsRoutes from './routes/leads.js';        // Leads CRUD
import facebookRoutes from './routes/facebook.js';  // Facebook Scraper
import outreachRoutes from './routes/outreach.js';  // Email Extractor

const app = express();

const PORT = process.env.PORT || 8080;

// CORS - Netlify اور localhost دونوں Allow
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://profound-lamington-3082f4.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI variable missing in Railway');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  process.exit(1);
});

// Routes
app.use('/api/scrape', scrapeRoutes);        // Google Maps Scraper
app.use('/api/leads', leadsRoutes);          // Leads CRUD
app.use('/api/facebook', facebookRoutes);    // Facebook Scraper
app.use('/api/emails', outreachRoutes);      // Email Extractor Tool

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'LeadStriker API is running',
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Server start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LeadStriker backend on port ${PORT}`);
});
