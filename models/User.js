import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plan: { type: String, default: 'free' },
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  settings: {
    theme: { type: String, default: 'purple' },
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'English' },
    emailReports: { type: String, default: 'Weekly' }
  },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model('User', userSchema);
