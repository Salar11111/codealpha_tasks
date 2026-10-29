import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    column: { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
    priority: { type: String, enum: ['none', 'low', 'medium', 'high', 'urgent'], default: 'none' },
    dueDate: { type: Date, default: null },
    labels: { type: [{ type: String, trim: true, maxlength: 24 }], default: [] },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    position: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checklist: {
      type: [
        {
          text: { type: String, required: true, trim: true, maxlength: 120 },
          done: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model('Task', taskSchema);
