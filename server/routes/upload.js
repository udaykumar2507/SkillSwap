import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload helper
function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (err, result) => err ? reject(err) : resolve(result)
    );
    Readable.from(buffer).pipe(stream);
  });
}

// profile photo
router.post("/profile-photo", auth, upload.single("file"), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer, "profiles");
    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
});

// certificate
router.post("/certificate", auth, upload.single("file"), async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file.buffer, "certificates");
    res.json({ url: result.secure_url, name: req.file.originalname });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
});

export default router;
