import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import scrapeRoutes from './routes/scrape.js';
import leadsRoutes from './routes/leads.js';
import facebookRoutes from './routes/facebook.js';
import outreachRoutes from './backend/routes/outreach.js';  // <-- YE NAYI LINE

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI variable missing in Railway!');
    process.exit(1);
}

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
});

// Routes
app.use('/api', scrapeRoutes);      // Google Maps
app.use('/api', leadsRoutes);       // GET & DELETE leads
app.use('/api', facebookRoutes);    // Facebook buyer scraper
app.use('/api', outreachRoutes);    // <-- YE NAYI LINE Email extractor

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        time: new Date()
    });
});

// Root route
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
    console.log(`✅ LeadStriker backend on port ${PORT}`);
});
