import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import scrapeRoutes from './routes/scrape.js';
import leadsRoutes from './routes/leads.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - Netlify + Localhost allow
app.use(cors({
  origin: ["https://gentle-sunshine-270772.netlify.app", "http://localhost:5173"],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api', scrapeRoutes);
app.use('/api', leadsRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'LeadStriker API is running', status: 'ok' });
});

// MongoDB connection - Error handle کر کے crash نہیں ہو گا
mongoose.connect(process.env.MONGO_URL, {
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB error:', err.message);
  console.log('⚠️ Server will run without DB. Fix MONGO_URL in Railway Variables');
});

// Server start - DB سے پہلے چلے گا
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ LeadStriker backend on port ${PORT}`);
});
