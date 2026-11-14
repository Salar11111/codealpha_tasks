import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

projectSchema.index({ members: 1, archived: 1, updatedAt: -1 });
projectSchema.index({ owner: 1 });

export default mongoose.model('Project', projectSchema);
