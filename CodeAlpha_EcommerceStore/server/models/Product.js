import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    // Stock change history for audit/logging
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
    // Restock notification subscribers
    restockNotifications: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        email: { type: String },
        subscribedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

productSchema.index({ active: 1, category: 1 });
productSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Product', productSchema);
