// backend/controllers/meetingHelper.js
import Meeting from '../models/Meeting.js';
import Request from '../models/Request.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

/**
 * Helper to generate a short, unguessable room name per meeting class.
 * Combines last 6 chars of meetingId + index + random chars.
 */
function genRoomName(meetingId, idx) {
  const shortId = String(meetingId).slice(-6);
  const rand = Math.random().toString(36).slice(2, 8); // 6 chars
  return `${shortId}-${idx}-${rand}`;
}

/**
 * Create meeting for a request.
 *
 * Options:
 *   - classDates: optional array of ISO datetimes to use exactly (length must equal request.classes)
 *   - intervalDays: integer, spacing between generated sessions (default: 2)
 *
 * Behavior:
 *   - If request.type === 'paid' -> teacher = toUser for all sessions
 *   - If request.type === 'exchange' -> teacher alternates: toUser, fromUser, toUser, ...
 *
 * Returns created meeting or null (if already exists).
 */
async function createMeetingForRequest(requestId, options = {}) {
  const { classDates, intervalDays = 2 } = options;

  // fetch with participants populated
  const reqDoc = await Request.findById(requestId).populate('fromUser toUser');
  if (!reqDoc) throw new Error('Request not found');

  // Prevent duplicate meeting creation
  if (reqDoc.meetingId) {
    return null; // already created
  }

  // Determine base datetimes
  const total = Number(reqDoc.classes || 0);
  if (!total || total <= 0) throw new Error('Invalid classes count on request');

  // If a `classDates` array is supplied, validate length
  let scheduleDates = null;
  if (Array.isArray(classDates) && classDates.length > 0) {
    if (classDates.length !== total) {
      throw new Error(`classDates length (${classDates.length}) must equal request.classes (${total})`);
    }
    scheduleDates = classDates.map(d => new Date(d));
    // validate each date
    if (scheduleDates.some(d => isNaN(d.getTime()))) throw new Error('One or more classDates are invalid');
  } else {
    // Build schedule starting from selectedSlot or first proposedSlot or now
    const start = reqDoc.selectedSlot ? new Date(reqDoc.selectedSlot)
                : (reqDoc.proposedSlots && reqDoc.proposedSlots.length > 0 ? new Date(reqDoc.proposedSlots[0]) : new Date());

    if (isNaN(start.getTime())) throw new Error('Invalid start datetime for scheduling');

    scheduleDates = [];
    for (let i = 0; i < total; i++) {
      const dt = new Date(start);
      // Add i * intervalDays days (so sessions occur every `intervalDays` days)
      dt.setDate(start.getDate() + i * intervalDays);
      scheduleDates.push(dt);
    }
  }

  // Build classes array with teacher assignments (roomName left empty for now)
  const classes = scheduleDates.map((dt, idx) => {
    let teacherId;
    if (reqDoc.type === 'paid') {
      teacherId = reqDoc.toUser._id;
    } else { // exchange
      // alternate teacher: even index -> toUser (instructor), odd -> fromUser (learner teaches)
      teacherId = (idx % 2 === 0) ? reqDoc.toUser._id : reqDoc.fromUser._id;
    }

    return {
      dateTime: dt,
      teacher: teacherId,
      status: 'upcoming',
      meetingLink: '',
      roomName: '' // we'll populate this immediately after meeting is created
    };
  });

  // Create meeting inside a session to keep consistency (optional but safer)
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const meeting = await Meeting.create([{
      requestId: reqDoc._id,
      participants: [reqDoc.fromUser._id, reqDoc.toUser._id],
      classes
    }], { session });

    // meeting is returned as array from create([...])
    const meetingDoc = meeting[0];

    // --- NEW: generate and assign roomName per class ---
    for (let i = 0; i < meetingDoc.classes.length; i++) {
      meetingDoc.classes[i].roomName = genRoomName(meetingDoc._id, i);
    }
    await meetingDoc.save({ session });
    // --- end new code ---

    // link meeting to request
    reqDoc.meetingId = meetingDoc._id;
    await reqDoc.save({ session });

    // Notifications to both participants
    const notifDocs = [
      {
        user: reqDoc.fromUser._id,
        type: 'meeting_created',
        message: 'Meeting has been scheduled for your request.',
        relatedRequest: reqDoc._id
      },
      {
        user: reqDoc.toUser._id,
        type: 'meeting_created',
        message: 'Meeting has been scheduled for your request.',
        relatedRequest: reqDoc._id
      }
    ];
    await Notification.insertMany(notifDocs, { session });

    await session.commitTransaction();
    session.endSession();

    return meetingDoc;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export { createMeetingForRequest };
