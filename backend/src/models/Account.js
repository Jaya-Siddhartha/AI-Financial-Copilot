import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accountHolder: {
      type: String,
      required: true,
      trim: true,
    },
    bankName: {
      type: String,
      default: 'Apex Horizon Federal (Simulated)',
    },
    accountNumberMasked: {
      type: String,
      default: '•••• 8829',
    },
    accountType: {
      type: String,
      default: 'Primary Salary & Savings',
    },
    startingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    currentBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCredited: {
      type: Number,
      default: 0,
    },
    totalDebited: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: '₹',
    },
  },
  {
    timestamps: true,
  }
);

export const Account = mongoose.model('Account', accountSchema);
