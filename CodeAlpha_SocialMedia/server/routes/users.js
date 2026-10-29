import { Router } from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Follow from '../models/Follow.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { presentPosts } from './posts.js';
import { notifySocial } from '../utils/notify.js';

const router = Router();
router.use(protect);

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const filter = { _id: { $ne: req.user._id } };
    if (q) {
      filter.$or = [
        { username: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ];
    }
    const users = await User.find(filter).select('name username bio').limit(20).sort({ username: 1 });
    const follows = await Follow.find({
      follower: req.user._id,
      following: { $in: users.map((user) => user._id) },
    }).select('following');
    const followingIds = new Set(follows.map((row) => row.following.toString()));
    res.json({
      users: users.map((user) => ({
        id: user._id,
        name: user.name,
        username: user.username,
        bio: user.bio,
        isFollowing: followingIds.has(user._id.toString()),
      })),
    });
  })
);

router.put(
  '/me',
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const bio = String(req.body.bio ?? '').trim();
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (bio.length > 280) return res.status(400).json({ message: 'Bio is limited to 280 characters' });
    req.user.name = name;
    req.user.bio = bio;
    await req.user.save();
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        username: req.user.username,
        bio: req.user.bio,
      },
    });
  })
);

async function peopleList(username, field) {
  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) return null;
  const rows = await Follow.find(field === 'followers' ? { following: user._id } : { follower: user._id }).populate(
    field === 'followers' ? 'follower' : 'following',
    'name username bio'
  );
  return rows
    .map((row) => (field === 'followers' ? row.follower : row.following))
    .filter(Boolean)
    .map((person) => ({ id: person._id, name: person.name, username: person.username, bio: person.bio }));
}

router.get(
  '/:username/followers',
  asyncHandler(async (req, res) => {
    const users = await peopleList(req.params.username, 'followers');
    if (!users) return res.status(404).json({ message: 'Profile not found' });
    res.json({ users });
  })
);

router.get(
  '/:username/following',
  asyncHandler(async (req, res) => {
    const users = await peopleList(req.params.username, 'following');
    if (!users) return res.status(404).json({ message: 'Profile not found' });
    res.json({ users });
  })
);

router.get(
  '/:username',
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ username: req.params.username.toLowerCase() }).select('-password');
    if (!user) return res.status(404).json({ message: 'Profile not found' });
    const [followers, following, isFollowing, posts] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
      Follow.exists({ follower: req.user._id, following: user._id }),
      Post.find({ author: user._id }).sort({ createdAt: -1 }).populate('author', 'name username'),
    ]);
    res.json({
      profile: {
        id: user._id,
        name: user.name,
        username: user.username,
        bio: user.bio,
        followers,
        following,
        isSelf: user._id.toString() === req.user._id.toString(),
        isFollowing: Boolean(isFollowing),
      },
      posts: await presentPosts(posts, req.user._id),
    });
  })
);

router.post(
  '/:id/follow',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    const existing = await Follow.findOne({ follower: req.user._id, following: target._id });
    if (!existing) {
      await Follow.create({ follower: req.user._id, following: target._id });
      await notifySocial({
        recipient: target._id,
        actor: req.user._id,
        type: 'follow',
        text: `${req.user.name} followed you`,
      });
    }
    res.json({ isFollowing: true });
  })
);

router.delete(
  '/:id/follow',
  asyncHandler(async (req, res) => {
    await Follow.deleteOne({ follower: req.user._id, following: req.params.id });
    res.json({ isFollowing: false });
  })
);

export default router;
