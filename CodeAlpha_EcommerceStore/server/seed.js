import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Product from './models/Product.js';
import Cart from './models/Cart.js';
import Order from './models/Order.js';
import Review from './models/Review.js';

const products = [
  {
    name: 'Stoneware Mug',
    description: 'A speckled everyday mug with a wide lip. Holds 12 oz and stacks cleanly in a cupboard.',
    price: 28,
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1200&q=80',
    category: 'Kitchen',
    stock: 18,
  },
  {
    name: 'Linen Apron',
    description: 'Washed linen apron with a crossed back and a deep front pocket for tools or a towel.',
    price: 46,
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80',
    category: 'Kitchen',
    stock: 12,
  },
  {
    name: 'Oak Board',
    description: 'End-grain oak board, oiled and ready for bread or vegetables. Wipe clean, never soak.',
    price: 62,
    image: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=1200&q=80',
    category: 'Kitchen',
    stock: 9,
  },
  {
    name: 'Brass Desk Lamp',
    description: 'Adjustable brass lamp with a warm LED bulb. Weighted base, cloth-covered cord.',
    price: 120,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80',
    category: 'Home',
    stock: 7,
  },
  {
    name: 'Wool Throw',
    description: 'Undyed wool throw with a loose weave. Large enough for a sofa, light enough for a chair.',
    price: 88,
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
    category: 'Home',
    stock: 10,
  },
  {
    name: 'Ceramic Vase',
    description: 'Hand-thrown vase in a matte clay glaze. Fits a small branch or a single stem.',
    price: 54,
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1200&q=80',
    category: 'Home',
    stock: 14,
  },
  {
    name: 'Notebook Trio',
    description: 'Three stitched notebooks in cream paper. Blank, lined, and dotted — one of each.',
    price: 22,
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80',
    category: 'Stationery',
    stock: 24,
  },
  {
    name: 'Fountain Pen',
    description: 'Matte black fountain pen with a medium steel nib. Comes with one ink cartridge.',
    price: 36,
    image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=1200&q=80',
    category: 'Stationery',
    stock: 4,
  },
];

await connectDB();
const password = await bcrypt.hash('password123', 10);
await User.findOneAndUpdate(
  { email: 'demo@codealpha.dev' },
  { name: 'Demo Shopper', email: 'demo@codealpha.dev', password, role: 'customer' },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
await User.findOneAndUpdate(
  { email: 'admin@codealpha.dev' },
  { name: 'Shop Admin', email: 'admin@codealpha.dev', password, role: 'admin' },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
await Product.deleteMany({});
await Cart.deleteMany({});
await Order.deleteMany({});
await Review.deleteMany({});
const saved = await Product.insertMany(products);
const demo = await User.findOne({ email: 'demo@codealpha.dev' });
await Review.create({
  product: saved[0]._id,
  user: demo._id,
  rating: 5,
  text: 'Wide lip, easy to stack, and it stays on the table.',
});
console.log('Seeded Northline. demo@codealpha.dev and admin@codealpha.dev / password123');
process.exit(0);
