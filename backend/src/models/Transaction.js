import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
      enum: [
        'Salary',
        'Freelance / Bonus',
        'Housing & Rent',
        'Groceries & Food',
        'Dining & Cafes',
        'Utilities & Bills',
        'Shopping & Lifestyle',
        'Transport & Fuel',
        'Entertainment & Subscriptions',
        'Healthcare & Wellness',
        'Investments & Savings',
        'Other',
      ],
      default: 'Other',
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
      default: 'UPI / Direct Bank Transfer',
    },
  },
  {
    timestamps: true,
  }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
