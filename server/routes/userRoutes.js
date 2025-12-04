import express from 'express';
import User from '../models/Users.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',authMiddleware, async (req, res) => {
  try {
    const { skill, type, sort } = req.query;

    const query = {};

    if (skill) {
      query.skillsHave = { $elemMatch: { $regex: new RegExp(skill, 'i') } };
    }

    if (type === 'paid') query.teachMode = { $in: ['paid', 'both'] };
    else if (type === 'exchange') query.teachMode = { $in: ['exchange', 'both'] };

    // Correctly exclude current user
    if (req.user && req.user.id) {
      query._id = { $ne: req.user.id };
    }

    let mongoQuery = User.find(query).select('-passwordHash');

    if (sort === 'price_low') mongoQuery = mongoQuery.sort({ price4: 1 });
    else if (sort === 'price_high') mongoQuery = mongoQuery.sort({ price4: -1 });
    else if (sort === 'rating_high') mongoQuery = mongoQuery.sort({ rating: -1 });

    const users = await mongoQuery;
    return res.json(users);
  } catch (err) {
    console.error('Discover error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});



// GET /api/users/:id (public profile)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('Get user error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id (update profile)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const {
      name,
      age,
      location,
      bio,
      skillsHave,
      skillsWant,
      certificates,
      introVideo,
      teachMode,
      price4,
      price6,
      profilePhoto,
    } = req.body;

    const update = {
      ...(name !== undefined && { name }),
      ...(age !== undefined && { age }),
      ...(location !== undefined && { location }),
      ...(bio !== undefined && { bio }),
      ...(skillsHave !== undefined && { skillsHave }),
      ...(skillsWant !== undefined && { skillsWant }),
      ...(certificates !== undefined && { certificates }),
      ...(introVideo !== undefined && { introVideo }),
      ...(teachMode !== undefined && { teachMode }),
      ...(price4 !== undefined && { price4 }),
      ...(price6 !== undefined && { price6 }),
      ...(profilePhoto !== undefined && { profilePhoto }),
    };

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).select("-passwordHash");

    return res.json(user);
  } catch (err) {
    console.error("Update user error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;

