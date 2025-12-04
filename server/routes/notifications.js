// backend/routes/notifications.js
import express from 'express';
const router = express.Router();
import authMiddleware from '../middleware/authMiddleware.js';
import Notification from '../models/Notification.js';

/**
 * GET /api/notifications
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notes = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error('GET notifications', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const note = await Notification.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Notification not found' });
    if (note.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not allowed' });

    note.read = true;
    await note.save();
    res.json(note);
  } catch (err) {
    console.error('PUT mark read', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
