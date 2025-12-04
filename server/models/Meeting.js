import mongoose from 'mongoose';

const ClassSlotSchema = new mongoose.Schema({
  dateTime: { type: Date, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['upcoming','completed','cancelled'], default: 'upcoming' },
  meetingLink: { type: String, default: '' } ,
  roomName: { type: String, default: '' } ,
  durationMin :{type:Number, default:60} // duration in minutes
}, { _id: true });

const MeetingSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // usually fromUser & toUser
  classes: [ClassSlotSchema]
}, { timestamps: true });

export default mongoose.model('Meeting',MeetingSchema);
