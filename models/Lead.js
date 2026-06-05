import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  address: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  placeId: { type: String, unique: true, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Lead', leadSchema);
