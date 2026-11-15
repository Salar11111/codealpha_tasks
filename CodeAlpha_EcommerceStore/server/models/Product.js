import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  size: { type: String, required: true, trim: true },
  color: { type: String, required: true, trim: true },
  colorHex: { type: String, default: '#1c1c1c' },
  sku: { type: String, trim: true, default: '' },
  stock: { type: Number, required: true, min: 0, default: 0 },
});

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    brand: { type: String, trim: true, default: 'Atelier & Oak' },
    department: { type: String, required: true, enum: ['Shoes', 'Clothing'], trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    details: [{ type: String, trim: true }],
    // Prices are integer cents.
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Price must be a whole number of cents' },
    },
    compareAtPrice: {
      type: Number,
      min: 0,
      default: null,
      validate: {
        validator: (value) => value === null || value === undefined || Number.isInteger(value),
        message: 'Compare-at price must be a whole number of cents',
      },
    },
    images: {
      type: [String],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one image is required',
      },
    },
    variants: [variantSchema],
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    stockHistory: [
      {
        oldStock: { type: Number, required: true },
        newStock: { type: Number, required: true },
        changeType: { type: String, enum: ['sold', 'restocked', 'admin_adjust'], required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    restockNotifications: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        email: { type: String },
        variantId: { type: mongoose.Schema.Types.ObjectId },
        subscribedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        const variants = doc.variants || [];
        ret.totalStock = variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
        ret.sizes = [...new Set(variants.map((variant) => variant.size))];
        const colors = [];
        const seen = new Set();
        for (const variant of variants) {
          if (!variant.color || seen.has(variant.color)) continue;
          seen.add(variant.color);
          colors.push({ name: variant.color, hex: variant.colorHex || '#1c1c1c' });
        }
        ret.colors = colors;
        ret.rating = { average: doc.ratingAverage || 0, count: doc.ratingCount || 0 };
        ret.image = ret.images?.[0] || '';
        delete ret.stockHistory;
        delete ret.restockNotifications;
        delete ret.__v;
        return ret;
      },
    },
  }
);

productSchema.pre('validate', async function ensureSlug() {
  if (!this.slug) this.slug = slugify(this.name);
  if (!this.slug) return;
  if (this.isNew || this.isModified('slug')) {
    const base = this.slug;
    let suffix = 1;
    while (await this.constructor.exists({ slug: this.slug, _id: { $ne: this._id } })) {
      suffix += 1;
      this.slug = `${base}-${suffix}`;
    }
  }
});

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ active: 1, department: 1, category: 1 });
productSchema.index({ featured: -1, createdAt: -1 });
productSchema.index({ name: 'text', brand: 'text', description: 'text' });

export default mongoose.model('Product', productSchema);
