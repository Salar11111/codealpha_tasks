import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Post from './models/Post.js';
import Comment from './models/Comment.js';
import Follow from './models/Follow.js';
import Bookmark from './models/Bookmark.js';
import Notification from './models/Notification.js';

const people = [
  {
    name: 'Demo Reader',
    email: 'demo@codealpha.dev',
    username: 'demo',
    bio: 'Trying the feed, one short note at a time.',
  },
  {
    name: 'Avery Cole',
    email: 'avery@codealpha.dev',
    username: 'avery',
    bio: 'Writes about rooms, walks, and what is on the desk.',
  },
  {
    name: 'Mina Park',
    email: 'mina@codealpha.dev',
    username: 'mina',
    bio: 'Sketching the week in public. Follow along.',
  },
];

await connectDB();
const password = await bcrypt.hash('password123', 10);
const users = {};
for (const person of people) {
  users[person.username] = await User.findOneAndUpdate(
    { email: person.email },
    { ...person, password },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

await Promise.all([
  Post.deleteMany({}),
  Comment.deleteMany({}),
  Follow.deleteMany({}),
  Bookmark.deleteMany({}),
  Notification.deleteMany({}),
]);

const averyPost = await Post.create({
  author: users.avery._id,
  text: 'Testing a quieter feed. Drop a comment if the layout holds up on a small screen.',
  image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
});
await Post.create({
  author: users.demo._id,
  text: 'First note from the demo account. Looking for people worth following.',
});
await Post.create({
  author: users.mina._id,
  text: 'Posted a week of desk sketches. Say hello if you want them in your feed.',
});
await Comment.create({
  post: averyPost._id,
  author: users.demo._id,
  text: 'It holds. The type is easy to read.',
});
await Follow.create({ follower: users.demo._id, following: users.avery._id });

console.log('Seeded Lumen. Logins use password123: demo@, avery@, mina@codealpha.dev');
process.exit(0);
