import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Follow from '../models/Follow.js';
import Bookmark from '../models/Bookmark.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notifySocial } from '../utils/notify.js';

const router = Router();
router.use(protect);

const authorFields = 'name username';
const uploadDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9.]+/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
      cb(new Error('Use a jpg, png, gif, or webp image'));
      return;
    }
    cb(null, true);
  },
});

function withImage(handler) {
  return (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      return handler(req, res, next);
    });
  };
}

export async function presentPosts(posts, userId) {
  const ids = posts.map((post) => post._id);
  const [counts, marks] = await Promise.all([
    Comment.aggregate([
      { $match: { post: { $in: ids } } },
      { $group: { _id: '$post', count: { $sum: 1 } } },
    ]),
    Bookmark.find({ user: userId, post: { $in: ids } }).select('post'),
  ]);
  const countMap = new Map(counts.map((row) => [row._id.toString(), row.count]));
  const saved = new Set(marks.map((row) => row.post.toString()));
  return posts.map((post) => {
    const plain = post.toObject ? post.toObject() : post;
    return {
      ...plain,
      image: plain.image || '',
      likeCount: plain.likes.length,
      liked: plain.likes.some((id) => id.toString() === userId.toString()),
      saved: saved.has(plain._id.toString()),
      commentCount: countMap.get(plain._id.toString()) || 0,
      likes: undefined,
    };
  });
}

router.get(
  '/feed',
  asyncHandler(async (req, res) => {
    const follows = await Follow.find({ follower: req.user._id }).select('following');
    const authorIds = follows.map((row) => row.following);
    authorIds.push(req.user._id);
    const posts = await Post.find({ author: { $in: authorIds } })
      .sort({ createdAt: -1 })
      .populate('author', authorFields);
    res.json({ posts: await presentPosts(posts, req.user._id) });
  })
);

router.get(
  '/saved',
  asyncHandler(async (req, res) => {
    const marks = await Bookmark.find({ user: req.user._id }).sort({ createdAt: -1 });
    const posts = await Post.find({ _id: { $in: marks.map((mark) => mark.post) } })
      .sort({ createdAt: -1 })
      .populate('author', authorFields);
    res.json({ posts: await presentPosts(posts, req.user._id) });
  })
);

router.post(
  '/',
  withImage(asyncHandler(async (req, res) => {
    const text = String(req.body.text || '').trim();
    const image = req.file ? `/uploads/${req.file.filename}` : String(req.body.image || '').trim();
    if (!text && !image) return res.status(400).json({ message: 'Write something or add an image' });
    if (text.length > 500) return res.status(400).json({ message: 'Posts are limited to 500 characters' });
    const post = await Post.create({ author: req.user._id, text, image });
    await post.populate('author', authorFields);
    const [shaped] = await presentPosts([post], req.user._id);
    res.status(201).json({ post: shaped });
  }))
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }
    const text = String(req.body.text || '').trim();
    if (!text && !post.image) return res.status(400).json({ message: 'Write something first' });
    if (text.length > 500) return res.status(400).json({ message: 'Posts are limited to 500 characters' });
    post.text = text;
    await post.save();
    await post.populate('author', authorFields);
    const [shaped] = await presentPosts([post], req.user._id);
    res.json({ post: shaped });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }
    await Comment.deleteMany({ post: post._id });
    await Bookmark.deleteMany({ post: post._id });
    await post.deleteOne();
    res.json({ ok: true });
  })
);

router.post(
  '/:id/like',
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const already = post.likes.some((id) => id.toString() === req.user._id.toString());
    if (already) post.likes.pull(req.user._id);
    else {
      post.likes.push(req.user._id);
      await notifySocial({
        recipient: post.author,
        actor: req.user._id,
        type: 'like',
        post: post._id,
        text: `${req.user.name} liked your post`,
      });
    }
    await post.save();
    await post.populate('author', authorFields);
    const [shaped] = await presentPosts([post], req.user._id);
    res.json({ post: shaped });
  })
);

router.post(
  '/:id/bookmark',
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const existing = await Bookmark.findOne({ user: req.user._id, post: post._id });
    if (existing) await existing.deleteOne();
    else await Bookmark.create({ user: req.user._id, post: post._id });
    await post.populate('author', authorFields);
    const [shaped] = await presentPosts([post], req.user._id);
    res.json({ post: shaped });
  })
);

router.get(
  '/:id/likes',
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id).populate('likes', 'name username');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({
      users: post.likes.map((person) => ({ id: person._id, name: person.name, username: person.username })),
    });
  })
);

router.get(
  '/:id/comments',
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const comments = await Comment.find({ post: post._id })
      .sort({ createdAt: 1 })
      .populate('author', authorFields);
    res.json({ comments });
  })
);

router.post(
  '/:id/comments',
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Comment cannot be empty' });
    if (text.length > 300) return res.status(400).json({ message: 'Comments are limited to 300 characters' });
    let parent = null;
    if (req.body.parent) {
      parent = await Comment.findOne({ _id: req.body.parent, post: post._id });
      if (!parent) return res.status(400).json({ message: 'That comment is not on this post' });
    }
    const comment = await Comment.create({ post: post._id, author: req.user._id, text, parent: parent?._id || null });
    await comment.populate('author', authorFields);
    await notifySocial({
      recipient: post.author,
      actor: req.user._id,
      type: 'comment',
      post: post._id,
      text: `${req.user.name} commented on your post`,
    });
    if (parent) {
      await notifySocial({
        recipient: parent.author,
        actor: req.user._id,
        type: 'reply',
        post: post._id,
        text: `${req.user.name} replied to your comment`,
      });
    }
    res.status(201).json({ comment });
  })
);

export default router;
