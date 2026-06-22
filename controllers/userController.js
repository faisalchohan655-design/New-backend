import User from '../models/User.js';

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
