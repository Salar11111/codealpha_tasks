import mongoose from 'mongoose';

export const ORDER_STATUSES = ['paid', 'preparing', 'shipped', 'delivered', 'cancelled'];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        variantId: { type: mongoose.Schema.Types.ObjectId },
        name: { type: String, required: true },
        brand: { type: String, default: '' },
        slug: { type: String, default: '' },
        image: { type: String, default: '' },
        size: { type: String, default: '' },
        color: { type: String, default: '' },
        price: { type: Number, required: true },
        qty: { type: Number, required: true, min: 1 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, default: '' },
      line1: { type: String, required: true },
      line2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, default: '' },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'United States' },
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'paid' },
    paymentRef: { type: String, default: '' },
    paidAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.itemCount = (doc.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);
        return ret;
      },
    },
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

export default mongoose.model('Order', orderSchema);
