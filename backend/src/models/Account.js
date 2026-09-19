import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    id: {
      type: String,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    accountHolder: {
      type: String,
      required: true,
      trim: true,
    },
    bankName: {
      type: String,
      default: 'HDFC Bank (Simulated UPI)',
    },
    accountNumberMasked: {
      type: String,
      default: '•••• 4092',
    },
    accountType: {
      type: String,
      default: 'Primary Savings & UPI',
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
    verifiedBalance: {
      type: Number,
      default: 0,
    },
    lastBalanceCheckDate: {
      type: Date,
      default: Date.now,
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
    _id: false,
  }
);

export const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
