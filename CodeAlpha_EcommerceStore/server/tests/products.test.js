import mongoose from 'mongoose';
import request from 'supertest';
import app from '../index.js';
import Product from '../models/Product.js';

const ids = [];

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const stamp = Date.now();
  const drafts = [
    {
      name: 'Filter Runner',
      slug: `filter-runner-${stamp}`,
      brand: 'Filter Brand',
      department: 'Shoes',
      category: 'Sneakers',
      description: 'A running shoe used by the filter test.',
      price: 10000,
      images: ['/products/sneakers-1.jpg'],
      variants: [{ size: '42', color: 'Cream', stock: 3 }],
      featured: true,
      ratingAverage: 4.8,
      ratingCount: 12,
    },
    {
      name: 'Filter Tee',
      slug: `filter-tee-${stamp}`,
      brand: 'Atelier & Oak',
      department: 'Clothing',
      category: 'T-Shirts',
      description: 'A tee used by the filter test.',
      price: 3000,
      images: ['/products/tshirts-1.jpg'],
      variants: [{ size: 'S', color: 'Black', stock: 0 }],
      ratingAverage: 4.2,
      ratingCount: 4,
    },
    {
      name: 'Filter Jean',
      slug: `filter-jean-${stamp}`,
      brand: 'Atelier & Oak',
      department: 'Clothing',
      category: 'Jeans',
      description: 'A jean used by the filter test.',
      price: 6000,
      compareAtPrice: 8000,
      images: ['/products/jeans-1.jpg'],
      variants: [{ size: '30', color: 'Navy', stock: 4 }],
      ratingAverage: 4.6,
      ratingCount: 8,
    },
    {
      name: 'Filter Hidden',
      slug: `filter-hidden-${stamp}`,
      brand: 'Atelier & Oak',
      department: 'Clothing',
      category: 'Jeans',
      description: 'A hidden product used by the filter test.',
      price: 5000,
      images: ['/products/jeans-2.jpg'],
      variants: [{ size: '32', color: 'Navy', stock: 2 }],
      active: false,
    },
  ];
  const created = await Product.insertMany(drafts);
  ids.push(...created.map((product) => product._id));
});

afterAll(async () => {
  if (ids.length) await Product.deleteMany({ _id: { $in: ids } });
  await mongoose.connection.close();
});

test('lists only active products with filters, sorting and facets', async () => {
  const all = await request(app).get('/api/products?q=Filter&limit=50');
  expect(all.status).toBe(200);
  expect(all.body.total).toBe(3);
  expect(all.body.facets.departments).toEqual(expect.arrayContaining(['Shoes', 'Clothing']));
  expect(all.body.facets.sizes).toEqual(expect.arrayContaining(['42', 'S', '30']));
  expect(all.body.facets.colors).toEqual(expect.arrayContaining(['Cream', 'Black', 'Navy']));

  const clothing = await request(app).get('/api/products?q=Filter&department=Clothing');
  expect(clothing.body.products).toHaveLength(2);

  const shoes = await request(app).get('/api/products?q=Filter&size=42&color=Cream');
  expect(shoes.body.products).toHaveLength(1);
  expect(shoes.body.products[0].name).toBe('Filter Runner');

  const byBrand = await request(app).get('/api/products?q=Filter%20Brand');
  expect(byBrand.body.products).toHaveLength(1);
  expect(byBrand.body.products[0].price).toBe(10000);

  const expensive = await request(app).get('/api/products?q=Filter&minPrice=5000');
  expect(expensive.body.products.map((product) => product.name).sort()).toEqual(['Filter Jean', 'Filter Runner']);

  const sorted = await request(app).get('/api/products?q=Filter&sort=price-asc');
  expect(sorted.body.products.map((product) => product.name)).toEqual([
    'Filter Tee',
    'Filter Jean',
    'Filter Runner',
  ]);

  const featured = await request(app).get('/api/products?q=Filter&featured=true');
  expect(featured.body.products).toHaveLength(1);
  expect(featured.body.products[0].name).toBe('Filter Runner');
  expect(featured.body.products[0].rating).toEqual({ average: 4.8, count: 12 });
  expect(featured.body.products[0].totalStock).toBe(3);
});

test('fetches a product by slug and returns related products', async () => {
  const product = await Product.findById(ids[0]);
  const response = await request(app).get(`/api/products/${product.slug}`);
  expect(response.status).toBe(200);
  expect(response.body.product.name).toBe('Filter Runner');
  expect(response.body.product.images).toHaveLength(1);
  expect(Array.isArray(response.body.related)).toBe(true);
  expect(response.body.related.every((item) => item.category !== 'Sneakers' || item._id !== ids[0])).toBe(true);

  const byId = await request(app).get(`/api/products/${ids[0]}`);
  expect(byId.status).toBe(200);

  const missing = await request(app).get('/api/products/does-not-exist');
  expect(missing.status).toBe(404);
});

test('hides inactive products from the catalogue', async () => {
  const hidden = await Product.findById(ids[3]);
  const response = await request(app).get(`/api/products/${hidden.slug}`);
  expect(response.status).toBe(404);
});
