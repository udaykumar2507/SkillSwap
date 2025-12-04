// backend/routes/meetings.js
import express from 'express';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware.js';
import Meeting from '../models/Meeting.js';
import Request from '../models/Request.js';
import Notification from '../models/Notification.js';
import User from '../models/Users.js';

const router = express.Router();

// join window constants (same as frontend)
const JOIN_BEFORE_MIN = 10;
const JOIN_AFTER_MIN = 90;

function inJoinWindow(classSlot) {
  const now = Date.now();
  const start = new Date(classSlot.dateTime).getTime();
  const joinWindowStart = start - JOIN_BEFORE_MIN * 60_000;
  const joinWindowEnd = start + JOIN_AFTER_MIN * 60_000;
  return now >= joinWindowStart && now <= joinWindowEnd;
}

// GET /api/meetings/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('participants', 'name email')
      .populate('classes.teacher', 'name email'); // populate teacher info inside classes if possible

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    // ensure user is participant
    const isParticipant = meeting.participants.some(p => String(p._id) === req.user.id);
    if (!isParticipant) return res.status(403).json({ message: 'Not allowed' });

    return res.json(meeting);
  } catch (err) {
    console.error('GET meeting', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/meetings/user/:userId
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    // allow self only or admins (simple)
    if (req.user.id !== req.params.userId) {
      // you may add admin check here. For now: only self
      return res.status(403).json({ message: 'Not allowed' });
    }
    const meetings = await Meeting.find({ participants: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('participants', 'name email');
    return res.json(meetings);
  } catch (err) {
    console.error('GET user meetings', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Secure reveal roomName for given class index.
 * GET /api/meetings/:meetingId/room/:index
 * Validates:
 *  - user is participant
 *  - class index exists
 *  - join window allowed
 */
router.get('/:meetingId/room/:index', authMiddleware, async (req, res) => {
  try {
    const { meetingId, index } = req.params;
    const idx = Number(index);
    if (isNaN(idx)) return res.status(400).json({ message: 'Invalid index' });

    const meeting = await Meeting.findById(meetingId).populate('participants', 'name email');
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    // ensure participant
    const isParticipant = meeting.participants.some(p => String(p._id) === req.user.id);
    if (!isParticipant) return res.status(403).json({ message: 'Not allowed' });

    const cls = meeting.classes[idx];
    if (!cls) return res.status(404).json({ message: 'Class slot not found' });

    // check class status
    if (cls.status === 'completed' || cls.status === 'cancelled') {
      return res.status(400).json({ message: 'Class is not open for joining' });
    }

    // check join window
    if (!inJoinWindow(cls)) {
      return res.status(400).json({ message: `You can join ${JOIN_BEFORE_MIN} minutes before start until ${JOIN_AFTER_MIN} minutes after start.` });
    }

    // respond with roomName and other small metadata
    return res.json({
      roomName: cls.roomName,
      durationMin: cls.durationMin || null, // optional if stored
      dateTime: cls.dateTime,
      teacher: cls.teacher
    });
  } catch (err) {
    console.error('GET room reveal', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/meetings/room-info/:roomName
 * Returns meetingId, classIndex, durationMin (read-only info).
 * Useful when frontend only has roomName (e.g. stored on meeting.classes[].roomName)
 * Requires auth and ensures user is participant for that meeting.
 */
router.get('/room-info/:roomName', authMiddleware, async (req, res) => {
  try {
    const { roomName } = req.params;
    if (!roomName) return res.status(400).json({ message: 'roomName required' });

    const meeting = await Meeting.findOne({ 'classes.roomName': roomName })
      .populate('participants', 'name email');

    if (!meeting) return res.status(404).json({ message: 'Room not found' });

    // ensure participant
    const isParticipant = meeting.participants.some(p => String(p._id) === req.user.id);
    if (!isParticipant) return res.status(403).json({ message: 'Not allowed' });

    // find class index
    const idx = meeting.classes.findIndex(c => c.roomName === roomName);
    if (idx === -1) return res.status(404).json({ message: 'Class not found' });

    const cls = meeting.classes[idx];

    // check join window - still allow returning info (frontend will still prevent join) but we'll return boolean
    const allowedToJoin = inJoinWindow(cls) && cls.status === 'upcoming';

    return res.json({
      meetingId: meeting._id,
      classIndex: idx,
      durationMin: cls.durationMin || null,
      dateTime: cls.dateTime,
      teacher: cls.teacher,
      canJoin: allowedToJoin
    });
  } catch (err) {
    console.error('GET room-info', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/meetings/:meetingId/classes/:index/complete
 * Body: { startAt, endAt } ISO strings or timestamps (optional — server will set if missing)
 * This endpoint is used by frontend when the call ends (timer expired or user ended).
 */
router.put('/:meetingId/classes/:index/complete', authMiddleware, async (req, res) => {
  try {
    const { meetingId, index } = req.params;
    const idx = Number(index);
    if (isNaN(idx)) return res.status(400).json({ message: 'Invalid index' });

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    // ensure participant
    const isParticipant = meeting.participants.some(p => String(p._id) === req.user.id);
    if (!isParticipant) return res.status(403).json({ message: 'Not allowed' });

    const cls = meeting.classes[idx];
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    // parse body times
    const { startAt, endAt } = req.body || {};
    const start = startAt ? new Date(startAt) : (cls.startAt ? new Date(cls.startAt) : new Date());
    const end = endAt ? new Date(endAt) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return res.status(400).json({ message: 'Invalid start/end times' });

    // calculate duration in seconds
    const durationSec = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));

    // update class fields
    meeting.classes[idx].status = 'completed';
    meeting.classes[idx].startAt = start;
    meeting.classes[idx].endAt = end;
    meeting.classes[idx].durationSec = durationSec;

    await meeting.save();

    // update request counters (if linked)
    if (meeting.requestId) {
      await Request.findByIdAndUpdate(meeting.requestId, {
        $inc: { classesCompleted: 1 }
      });
    }

    // notify participants
    const notifDocs = (meeting.participants || []).map(pId => ({
      user: pId,
      type: 'class_completed',
      message: `Class #${idx + 1} for meeting ${String(meeting._id).slice(-6)} was marked completed.`,
      relatedRequest: meeting.requestId || null
    }));
    await Notification.insertMany(notifDocs);

    return res.json({ message: 'Class marked completed', durationSec, startAt: start, endAt: end });
  } catch (err) {
    console.error('PUT complete', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
