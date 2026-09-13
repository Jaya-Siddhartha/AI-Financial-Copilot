import mongoose from 'mongoose';

const emiSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    lender: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    dueDay: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    dueDate: {
      type: Date,
    },
    frequency: {
      type: String,
      default: 'Monthly',
    },
    totalLoanAmount: {
      type: Number,
      default: 0,
    },
    remainingInstallments: {
      type: Number,
      default: 12,
    },
    status: {
      type: String,
      enum: ['upcoming', 'paid_this_cycle', 'overdue'],
      default: 'upcoming',
    },
    lastPaidDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const EMI = mongoose.model('EMI', emiSchema);
