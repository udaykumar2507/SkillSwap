import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // e.g. new_request, request_accepted, request_rejected, meeting_created, payment_done
  message: { type: String },
  relatedRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

// index for faster unread count queries
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', NotificationSchema);