import mongoose from 'mongoose';

const RequestSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type: { type: String, enum: ['paid', 'exchange'], required: true },
  classes: { type: Number, enum: [4, 6], required: true },

  // proposed slots (learner's suggestions)
  proposedSlots: [{ type: Date, required: true }],

  // slot selected by instructor (one of proposedSlots)
  selectedSlot: { type: Date },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },

  paymentStatus: {
    type: String,
    enum: ['not_paid','paid','partial_released','fully_released','not_applicable'],
    default: 'not_applicable'
  },

  totalAmount: { type: Number, default: 0 },     // total for the package (paid)
  perClassAmount: { type: Number, default: 0 },  // totalAmount / classes

  // For tracking releases (Week-3)
  amountReleased: { type: Number, default: 0 },
  classesCompleted: { type: Number, default: 0 },

  // link to the meeting schedule
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' }
}, { timestamps: true });

export default mongoose.model('Request', RequestSchema);
