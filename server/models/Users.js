// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: Number,
  location: String,

  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },

  bio: { type: String },

  skillsHave: [{ type: String }], // skills they can teach
  skillsWant: [{ type: String }], // skills they want to learn

  certificates: [{ type: String }], // URLs of uploaded files / links
  introVideo: { type: String },      // YouTube or video URL

  profilePhoto: { type: String },    // NEW: Cloudinary URL

  teachMode: {
    type: String,
    enum: ["paid", "exchange", "both"],
    default: "both",
  },

  price4: { type: Number, default: 0 }, // 4-class package
  price6: { type: Number, default: 0 }, // 6-class package

  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
