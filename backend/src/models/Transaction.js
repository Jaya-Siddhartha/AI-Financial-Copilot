import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    id: {
      type: String,
      index: true,
    },
    accountId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    merchant: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: true,
      default: 'Daily Expenses',
    },
    type: {
      type: String,
      required: true,
      enum: ['credit', 'debit'],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'completed',
    },
    paymentMethod: {
      type: String,
      default: 'UPI',
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

transactionSchema.index({ userId: 1, date: -1 });

export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
