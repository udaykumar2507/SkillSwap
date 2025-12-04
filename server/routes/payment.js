// backend/routes/payment.js
import express from 'express';
const router = express.Router();
import authMiddleware from '../middleware/authMiddleware.js';
import Request from '../models/Request.js';
import Notification from '../models/Notification.js';
import { createMeetingForRequest } from '../controllers/meetingHelper.js';

/**
 * POST /api/payment/:requestId/pay
 * Fake payment endpoint used for frontend testing.
 * Body (optional): { intervalDays: number, classDates: [ISO,...] }
 */
router.post('/:requestId/pay', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { intervalDays, classDates } = req.body || {};

    const reqDoc = await Request.findById(requestId);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });

    // Only the learner (fromUser) can pay
    if (reqDoc.fromUser.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the requester can make payment' });
    }

    // Only for paid requests which are accepted and not yet paid
    if (reqDoc.type !== 'paid') {
      return res.status(400).json({ message: 'Payment only required for paid requests' });
    }
    if (reqDoc.status !== 'accepted') {
      return res.status(400).json({ message: 'Request must be accepted before payment' });
    }
    if (reqDoc.paymentStatus === 'paid' || reqDoc.paymentStatus === 'partial_released' || reqDoc.paymentStatus === 'fully_released') {
      return res.status(400).json({ message: 'Request already paid or processed' });
    }

    // Mark as paid (fake)
    reqDoc.paymentStatus = 'paid';
    reqDoc.paidAt = new Date();
    await reqDoc.save();

    // Create notification for instructor
    await Notification.create({
      user: reqDoc.toUser,
      type: 'payment_done',
      message: `Learner has completed payment for the request.`,
      relatedRequest: reqDoc._id
    });

    // Create meeting now (paid flow) — pass intervalDays or classDates if provided
    let meeting = null;
    try {
      const options = {};
      if (typeof intervalDays === 'number') options.intervalDays = intervalDays;
      if (Array.isArray(classDates) && classDates.length > 0) options.classDates = classDates;
      meeting = await createMeetingForRequest(reqDoc._id, options);
    } catch (err) {
      // If meeting creation fails, we still consider payment done — log error and return both objects
      console.error('createMeetingForRequest error after payment:', err);
    }

    // Return updated request and meeting (if any)
    const populated = await Request.findById(reqDoc._id)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email');

    return res.json({ request: populated, meeting });
  } catch (err) {
    console.error('POST /api/payment/:requestId/pay error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
