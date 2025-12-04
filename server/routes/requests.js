// backend/routes/requests.js
import express from 'express';
const router = express.Router();
import mongoose from 'mongoose';
import Request from '../models/Request.js';
import User from '../models/Users.js';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { createMeetingForRequest } from '../controllers/meetingHelper.js';
/**
 * POST /api/requests
 * Body: { toUser, type, classes, proposedSlots: [ISO,...] }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { toUser, type, classes, proposedSlots } = req.body;
    const fromUser = req.user.id;

    if (!toUser || !type || !classes || !proposedSlots || !Array.isArray(proposedSlots) || proposedSlots.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (fromUser === toUser) return res.status(400).json({ message: 'Cannot request yourself' });

    const teacher = await User.findById(toUser);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    let totalAmount = 0, perClassAmount = 0;
    if (type === 'paid') {
      totalAmount = classes === 4 ? (teacher.price4 || 0) : (teacher.price6 || 0);
      perClassAmount = totalAmount && classes ? totalAmount / classes : 0;
    }

    const request = await Request.create({
      fromUser,
      toUser,
      type,
      classes,
      proposedSlots: proposedSlots.map(s => new Date(s)),
      selectedSlot: null,
      status: 'pending',
      paymentStatus: type === 'paid' ? 'not_paid' : 'not_applicable',
      totalAmount,
      perClassAmount
    });

    // create notification for teacher
    await Notification.create({
      user: toUser,
      type: 'new_request',
      message: `You have a new ${type} request from a learner.`,
      relatedRequest: request._id
    });

    const populated = await Request.findById(request._id)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email');

    return res.status(201).json(populated);
  } catch (err) {
    console.error('POST /api/requests error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/requests/incoming
 */
router.get('/incoming', authMiddleware, async (req, res) => {
  try {
    const requests = await Request.find({ toUser: req.user.id }).sort({ createdAt: -1 })
      .populate('fromUser', 'name email skillsHave')
      .populate('toUser', 'name email');
    res.json(requests);
  } catch (err) {
    console.error('GET incoming', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/requests/sent
 */
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const requests = await Request.find({ fromUser: req.user.id }).sort({ createdAt: -1 })
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email skillsHave');
    res.json(requests);
  } catch (err) {
    console.error('GET sent', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/requests/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('fromUser', 'name email skillsHave')
      .populate('toUser', 'name email skillsHave meetingId');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    // only fromUser or toUser can view
    if (![request.fromUser._id.toString(), request.toUser._id.toString()].includes(req.user.id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    res.json(request);
  } catch (err) {
    console.error('GET request by id', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/requests/:id/select-slot
 * Body: { selectedSlot }
 * Atomic update: only when status === 'pending' and proposedSlots contains selectedSlot
 */
router.put('/:id/select-slot', authMiddleware, async (req, res) => {
  try {
    const { selectedSlot } = req.body;
    if (!selectedSlot) return res.status(400).json({ message: 'selectedSlot required' });

    // ensure ISO -> Date
    const slotDate = new Date(selectedSlot);

    // Atomic update: require toUser is req.user.id and status pending and proposedSlots has selected slot
    const updated = await Request.findOneAndUpdate(
      { _id: req.params.id, toUser: req.user.id, status: 'pending', proposedSlots: slotDate },
      { $set: { status: 'accepted', selectedSlot: slotDate, paymentStatus: undefined } }, // we'll set paymentStatus below
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ message: 'Slot selection failed: maybe already handled or slot invalid' });
    }

    // set paymentStatus according to type
    if (updated.type === 'paid') updated.paymentStatus = 'not_paid';
    else updated.paymentStatus = 'not_applicable';

    await updated.save();

    // create notification for learner
    await Notification.create({
      user: updated.fromUser,
      type: 'request_accepted',
      message: `Your request was accepted. Selected slot: ${slotDate.toISOString()}`,
      relatedRequest: updated._id
    });

    // If exchange -> create meeting immediately
    if (updated.type === 'exchange') {
      try {
        const meeting = await createMeetingForRequest(updated._id);
        // meeting creation will update request.meetingId
      } catch (err) {
        console.error('Auto-create meeting (exchange) failed', err);
      }
    }

    const populated = await Request.findById(updated._id)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email');

    return res.json(populated);
  } catch (err) {
    console.error('PUT select-slot', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/requests/:id/reject
 */
router.put('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const reqDoc = await Request.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.toUser.toString() !== req.user.id) return res.status(403).json({ message: 'Not allowed' });

    reqDoc.status = 'rejected';
    await reqDoc.save();

    await Notification.create({
      user: reqDoc.fromUser,
      type: 'request_rejected',
      message: 'Your request was rejected by the instructor.',
      relatedRequest: reqDoc._id
    });

    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error('PUT reject', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;