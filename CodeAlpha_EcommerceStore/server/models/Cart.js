import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
        qty: { type: Number, required: true, min: 1 },
      },
    ],
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

export default mongoose.model('Cart', cartSchema);
