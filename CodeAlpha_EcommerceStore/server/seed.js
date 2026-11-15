import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import Cart from './models/Cart.js';
import Order from './models/Order.js';
import Product from './models/Product.js';
import Review from './models/Review.js';
import User from './models/User.js';
import { hexForColor } from './utils/colors.js';

const SHOE_SIZES = ['40', '41', '42', '43', '44', '45'];
const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const JEAN_SIZES = ['28', '30', '32', '34', '36'];

const catalog = [
  {
    name: 'Court Low Sneaker',
    brand: 'Atelier & Oak',
    department: 'Shoes',
    category: 'Sneakers',
    price: 16800,
    compareAtPrice: 21000,
    description:
      'A low-profile court shoe cut from vegetable-tanned leather and built on a stitched rubber sole. Designed to be resoled, not replaced.',
    details: ['Vegetable-tanned leather upper', 'Stitched rubber cupsole', 'Cork-and-latex footbed'],
    images: ['/products/sneakers-1.jpg', '/products/sneakers-2.jpg', '/products/sneakers-3.jpg'],
    colors: ['Cream', 'Black', 'Olive'],
    sizes: SHOE_SIZES,
    featured: true,
    ratingAverage: 4.8,
    ratingCount: 126,
  },
  {
    name: 'Canvas Weekender',
    brand: 'Atelier & Oak',
    department: 'Shoes',
    category: 'Sneakers',
    price: 12500,
    compareAtPrice: null,
    description:
      'Heavy cotton canvas over a flexible vulcanised sole. A warm-weather shoe that softens with every wear.',
    details: ['12oz organic cotton canvas', 'Vulcanised natural rubber sole', 'Removable cotton insole'],
    images: ['/products/sneakers-2.jpg', '/products/sneakers-5.jpg', '/products/sneakers-6.jpg'],
    colors: ['Cream', 'Navy', 'Black'],
    sizes: SHOE_SIZES,
    featured: false,
    ratingAverage: 4.6,
    ratingCount: 58,
  },
  {
    name: 'Trail Runner GTX',
    brand: 'Atelier & Oak',
    department: 'Shoes',
    category: 'Sneakers',
    price: 18500,
    compareAtPrice: null,
    description:
      'A weatherproof trail shoe with a lugged outsole and a reinforced toe. Made for wet mornings and long paths.',
    details: ['Waterproof membrane lining', 'Lugged rubber outsole', 'Reinforced suede toe cap'],
    images: ['/products/sneakers-3.jpg', '/products/sneakers-4.jpg', '/products/sneakers-6.jpg'],
    colors: ['Olive', 'Black', 'Tan'],
    sizes: SHOE_SIZES,
    featured: false,
    ratingAverage: 4.7,
    ratingCount: 41,
  },
  {
    name: 'Tempo Running Shoe',
    brand: 'Atelier & Oak',
    department: 'Shoes',
    category: 'Running',
    price: 14500,
    compareAtPrice: null,
    description:
      'A light daily trainer with a responsive foam midsole and a breathable knit upper. Built for easy miles and tempo days alike.',
    details: ['Engineered knit upper', 'Compression-moulded foam midsole', 'Reflective heel detail'],
    images: ['/products/running-1.jpg', '/products/running-2.jpg', '/products/running-3.jpg'],
    colors: ['Black', 'Cream', 'Rust'],
    sizes: SHOE_SIZES,
    featured: true,
    ratingAverage: 4.9,
    ratingCount: 203,
  },
  {
    name: 'Long Run Trainer',
    brand: 'Atelier & Oak',
    department: 'Shoes',
    category: 'Running',
    price: 15800,
    compareAtPrice: 18500,
    description:
      'More cushioning, same quiet silhouette. A distance shoe for runners who prefer a firm, predictable ride.',
    details: ['Dual-density foam midsole', 'Recycled mesh upper', 'Rubber outsole with flex grooves'],
    images: ['/products/running-4.jpg', '/products/running-5.jpg', '/products/running-6.jpg'],
    colors: ['Navy', 'White', 'Olive'],
    sizes: SHOE_SIZES,
    featured: false,
    ratingAverage: 4.5,
    ratingCount: 77,
  },
  {
    name: 'Ridgeline Chelsea Boot',
    brand: 'Atelier Workshop',
    department: 'Shoes',
    category: 'Boots',
    price: 24800,
    compareAtPrice: 31000,
    description:
      'Our signature Chelsea, made on a Goodyear-welted last from full-grain leather. Elastic gussets, a pull tab, and a sole that can be replaced for decades.',
    details: ['Full-grain leather upper', 'Goodyear-welted leather sole', 'Hand-finished in small batches'],
    images: ['/products/boots-1.jpg', '/products/boots-2.jpg'],
    colors: ['Chestnut', 'Black'],
    sizes: SHOE_SIZES,
    featured: true,
    ratingAverage: 4.9,
    ratingCount: 88,
  },
  {
    name: 'Workshop Lace Boot',
    brand: 'Atelier Workshop',
    department: 'Shoes',
    category: 'Boots',
    price: 28500,
    compareAtPrice: null,
    description:
      'A lace-up work boot with a storm welt and a padded collar. Heavy enough for winter, quiet enough for the city.',
    details: ['Oiled full-grain leather', 'Storm-welted commando sole', 'Solid brass eyelets'],
    images: ['/products/boots-3.jpg', '/products/boots-4.jpg'],
    colors: ['Brown', 'Black'],
    sizes: SHOE_SIZES,
    featured: false,
    ratingAverage: 4.7,
    ratingCount: 34,
  },
  {
    name: 'Heavyweight Pocket Tee',
    brand: 'Oak Standard',
    department: 'Clothing',
    category: 'T-Shirts',
    price: 4800,
    compareAtPrice: null,
    description:
      'A 240gsm cotton tee with a reinforced chest pocket and a collar that keeps its shape. Cut straight through the body.',
    details: ['240gsm organic cotton jersey', 'Tubular body, no side seams', 'Garment-washed for softness'],
    images: ['/products/tshirts-1.jpg', '/products/tshirts-2.jpg', '/products/tshirts-3.jpg'],
    colors: ['White', 'Black', 'Olive'],
    sizes: CLOTHING_SIZES,
    featured: true,
    ratingAverage: 4.8,
    ratingCount: 152,
  },
  {
    name: 'Garment-Dyed Crew Tee',
    brand: 'Oak Standard',
    department: 'Clothing',
    category: 'T-Shirts',
    price: 4200,
    compareAtPrice: 5200,
    description:
      'Dyed after sewing so the colour settles unevenly, the way a favourite tee should. Soft from the first wash.',
    details: ['200gsm combed cotton', 'Garment-dyed in small lots', 'Ribbed collar with taped seams'],
    images: ['/products/tshirts-3.jpg', '/products/tshirts-4.jpg', '/products/tshirts-5.jpg'],
    colors: ['Rust', 'Sand', 'Navy'],
    sizes: CLOTHING_SIZES,
    featured: false,
    ratingAverage: 4.6,
    ratingCount: 96,
  },
  {
    name: 'Long-Sleeve Jersey Tee',
    brand: 'Oak Standard',
    department: 'Clothing',
    category: 'T-Shirts',
    price: 5800,
    compareAtPrice: null,
    description:
      'A layering staple with a slightly heavier hand and a clean crew neck. Long enough in the body to stay tucked.',
    details: ['220gsm cotton jersey', 'Ribbed cuffs', 'Pre-shrunk finish'],
    images: ['/products/tshirts-5.jpg', '/products/tshirts-6.jpg', '/products/tshirts-1.jpg'],
    colors: ['Cream', 'Charcoal', 'Olive'],
    sizes: CLOTHING_SIZES,
    featured: false,
    ratingAverage: 4.4,
    ratingCount: 61,
  },
  {
    name: 'Selvedge Straight Jean',
    brand: 'Oak Standard',
    department: 'Clothing',
    category: 'Jeans',
    price: 14800,
    compareAtPrice: null,
    description:
      'A true straight leg in 13.5oz Japanese selvedge denim. Rigid at first, then shaped entirely by you.',
    details: ['13.5oz Japanese selvedge denim', 'Button fly with copper hardware', 'Chain-stitched hem'],
    images: ['/products/jeans-1.jpg', '/products/jeans-2.jpg', '/products/jeans-3.jpg'],
    colors: ['Navy', 'Black'],
    sizes: JEAN_SIZES,
    featured: true,
    ratingAverage: 4.7,
    ratingCount: 119,
  },
  {
    name: 'Relaxed Taper Jean',
    brand: 'Oak Standard',
    department: 'Clothing',
    category: 'Jeans',
    price: 12800,
    compareAtPrice: 16000,
    description:
      'Roomy through the seat and thigh, tapering below the knee. Washed once so the fit you try on is the fit you keep.',
    details: ['12oz stretch cotton denim', 'Relaxed taper leg', 'Soft-washed finish'],
    images: ['/products/jeans-4.jpg', '/products/jeans-5.jpg', '/products/jeans-6.jpg'],
    colors: ['Sand', 'Navy'],
    sizes: JEAN_SIZES,
    featured: false,
    ratingAverage: 4.5,
    ratingCount: 73,
  },
  {
    name: 'Waxed Field Jacket',
    brand: 'Atelier Workshop',
    department: 'Clothing',
    category: 'Jackets',
    price: 32800,
    compareAtPrice: null,
    description:
      'A four-pocket field jacket in waxed British cotton. Water-resistant out of the box, and re-waxable for years.',
    details: ['8oz waxed cotton', 'Corduroy collar lining', 'Two-way brass zip'],
    images: ['/products/jackets-1.jpg', '/products/jackets-2.jpg'],
    colors: ['Olive', 'Brown'],
    sizes: CLOTHING_SIZES,
    featured: true,
    ratingAverage: 4.9,
    ratingCount: 45,
  },
  {
    name: 'Quilted Liner Jacket',
    brand: 'Atelier Workshop',
    department: 'Clothing',
    category: 'Jackets',
    price: 21500,
    compareAtPrice: null,
    description:
      'A light diamond-quilted layer that works under a coat or on its own in autumn. Packable enough for a bag.',
    details: ['Recycled poly shell and fill', 'Snap-front placket', 'Two welt pockets'],
    images: ['/products/jackets-3.jpg', '/products/jackets-4.jpg'],
    colors: ['Black', 'Navy'],
    sizes: CLOTHING_SIZES,
    featured: false,
    ratingAverage: 4.6,
    ratingCount: 38,
  },
  {
    name: 'Chore Coat',
    brand: 'Atelier Workshop',
    department: 'Clothing',
    category: 'Jackets',
    price: 18500,
    compareAtPrice: null,
    description:
      'Three patch pockets and a straight hem, cut from a sturdy cotton twill that fades honestly with wear.',
    details: ['10oz cotton twill', 'Triple-stitched seams', 'Unlined body'],
    images: ['/products/jackets-2.jpg', '/products/jackets-3.jpg'],
    colors: ['Tan', 'Charcoal'],
    sizes: CLOTHING_SIZES,
    featured: false,
    ratingAverage: 4.7,
    ratingCount: 52,
  },
  {
    name: 'Linen Wrap Dress',
    brand: 'Atelier & Oak',
    department: 'Clothing',
    category: 'Dresses',
    price: 16800,
    compareAtPrice: null,
    description:
      'A softly structured wrap dress in washed European linen. Ties at the waist, falls mid-calf, and gets better with every summer.',
    details: ['Washed European linen', 'Adjustable wrap tie', 'Side seam pockets'],
    images: ['/products/dresses-1.jpg', '/products/dresses-2.jpg'],
    colors: ['Cream', 'Rust'],
    sizes: CLOTHING_SIZES,
    featured: true,
    ratingAverage: 4.8,
    ratingCount: 64,
  },
  {
    name: 'Poplin Shirt Dress',
    brand: 'Atelier & Oak',
    department: 'Clothing',
    category: 'Dresses',
    price: 14200,
    compareAtPrice: 17500,
    description:
      'Crisp cotton poplin with a stand collar and a belted waist. Formal enough for work, easy enough for the weekend.',
    details: ['Organic cotton poplin', 'Removable self belt', 'Mother-of-pearl buttons'],
    images: ['/products/dresses-3.jpg', '/products/dresses-4.jpg'],
    colors: ['White', 'Navy'],
    sizes: CLOTHING_SIZES,
    featured: false,
    ratingAverage: 4.5,
    ratingCount: 29,
  },
  {
    name: 'Loopback Hoodie',
    brand: 'Oak Standard',
    department: 'Clothing',
    category: 'Hoodies',
    price: 9800,
    compareAtPrice: null,
    description:
      'A loopback cotton hoodie with a heavy drawcord and a double-layer hood. The kind you keep on after the walk home.',
    details: ['380gsm loopback cotton', 'Double-layer hood', 'Ribbed cuffs and hem'],
    images: ['/products/hoodies-1.jpg', '/products/hoodies-2.webp'],
    colors: ['Cream', 'Charcoal'],
    sizes: CLOTHING_SIZES,
    featured: true,
    ratingAverage: 4.8,
    ratingCount: 141,
  },
  {
    name: 'Heavy Fleece Hoodie',
    brand: 'Oak Standard',
    department: 'Clothing',
    category: 'Hoodies',
    price: 11200,
    compareAtPrice: null,
    description:
      'Brushed fleece inside, dense jersey outside. Cut a little boxier, with a kangaroo pocket that holds its shape.',
    details: ['450gsm brushed fleece', 'Boxy fit', 'Kangaroo pocket with bar-tacked corners'],
    images: ['/products/hoodies-3.jpg', '/products/hoodies-4.jpg'],
    colors: ['Black', 'Olive'],
    sizes: CLOTHING_SIZES,
    featured: false,
    ratingAverage: 4.7,
    ratingCount: 88,
  },
  {
    name: 'Zip-Through Hoodie',
    brand: 'Oak Standard',
    department: 'Clothing',
    category: 'Hoodies',
    price: 10500,
    compareAtPrice: null,
    description:
      'A full-zip layer in midweight fleece, with a metal zip and a clean, unlined hood. Made to be worn open over a tee.',
    details: ['400gsm cotton fleece', 'Two-way YKK zip', 'Split kangaroo pockets'],
    images: ['/products/hoodies-2.webp', '/products/hoodies-4.jpg'],
    colors: ['Navy', 'Sand'],
    sizes: CLOTHING_SIZES,
    featured: false,
    ratingAverage: 4.6,
    ratingCount: 57,
  },
];

const reviewSeed = [
  {
    product: 'Ridgeline Chelsea Boot',
    rating: 5,
    text: 'Third season in these and the leather has only gotten better. The resole option sold me and the fit was true to size.',
  },
  {
    product: 'Ridgeline Chelsea Boot',
    rating: 5,
    text: 'Heavy in the hand in the best way. No break-in pain, and the elastic still snaps back.',
  },
  {
    product: 'Court Low Sneaker',
    rating: 5,
    text: 'Clean enough for the office, comfortable enough for a long walk home. Runs true to size.',
  },
  {
    product: 'Court Low Sneaker',
    rating: 4,
    text: 'Lovely leather and the cream colour is warmer in person. Took a week to soften across the toes.',
  },
  {
    product: 'Loopback Hoodie',
    rating: 5,
    text: 'The loopback is properly heavy, not the thin stuff. Washed it five times and it still holds its shape.',
  },
  {
    product: 'Selvedge Straight Jean',
    rating: 5,
    text: 'Stiff for the first fortnight, then perfect. The straight leg is actually straight.',
  },
  {
    product: 'Tempo Running Shoe',
    rating: 5,
    text: 'Did a half marathon out of the box with no blisters. Firm enough for tempo work.',
  },
  {
    product: 'Linen Wrap Dress',
    rating: 4,
    text: 'Beautiful weight of linen. I sized down for a closer wrap and it was the right call.',
  },
];

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function buildVariants(entry) {
  const variants = [];
  let index = 0;
  for (const color of entry.colors) {
    for (const size of entry.sizes) {
      index += 1;
      const stock = index % 13 === 0 ? 0 : ((index * 7) % 9) + 1;
      variants.push({
        size,
        color,
        colorHex: hexForColor(color),
        sku: `${slugify(entry.name).slice(0, 8).toUpperCase()}-${size}-${color.slice(0, 3).toUpperCase()}`,
        stock,
      });
    }
  }
  return variants;
}

await connectDB();

// The catalogue changed shape (variant-level stock, integer cents), so a reseed
// replaces products, carts and orders instead of trying to migrate old data.
await Promise.all([Product.deleteMany({}), Review.deleteMany({}), Cart.deleteMany({}), Order.deleteMany({})]);

const password = await bcrypt.hash('password123', 10);
const demo = await User.findOneAndUpdate(
  { email: 'demo@codealpha.dev' },
  { $setOnInsert: { name: 'Demo Shopper', email: 'demo@codealpha.dev', password, role: 'customer' } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
await User.findOneAndUpdate(
  { email: 'admin@codealpha.dev' },
  { $setOnInsert: { name: 'Shop Admin', email: 'admin@codealpha.dev', password, role: 'admin' } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const reviewers = await Promise.all(
  ['mara', 'theo', 'ines', 'jonas'].map((handle) =>
    User.findOneAndUpdate(
      { email: `${handle}@atelier.local` },
      {
        $setOnInsert: {
          name: `${handle[0].toUpperCase()}${handle.slice(1)}`,
          email: `${handle}@atelier.local`,
          password,
          role: 'customer',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  )
);

const saved = await Product.insertMany(
  catalog.map((entry) => ({
    name: entry.name,
    slug: slugify(entry.name),
    brand: entry.brand,
    department: entry.department,
    category: entry.category,
    description: entry.description,
    details: entry.details,
    price: entry.price,
    compareAtPrice: entry.compareAtPrice,
    images: entry.images,
    variants: buildVariants(entry),
    featured: entry.featured,
    active: true,
    ratingAverage: entry.ratingAverage,
    ratingCount: entry.ratingCount,
  }))
);

const byName = new Map(saved.map((product) => [product.name, product]));
await Review.insertMany(
  reviewSeed.map((entry, index) => ({
    product: byName.get(entry.product)._id,
    user: index === 0 ? demo._id : reviewers[index % reviewers.length]._id,
    rating: entry.rating,
    text: entry.text,
  }))
);

const totalStock = saved.reduce(
  (sum, product) => sum + product.variants.reduce((inner, variant) => inner + variant.stock, 0),
  0
);
console.log(
  `Seeded Atelier & Oak: ${saved.length} products, ${saved.reduce((sum, p) => sum + p.variants.length, 0)} variants, ${totalStock} units.`
);
console.log('demo@codealpha.dev and admin@codealpha.dev / password123');
process.exit(0);
