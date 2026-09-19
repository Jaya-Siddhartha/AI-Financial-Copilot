import mongoose from 'mongoose';

const emiSchema = new mongoose.Schema(
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
    accountId: {
      type: String,
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
    _id: false,
  }
);

emiSchema.index({ userId: 1, dueDay: 1 });

export const EMI = mongoose.models.EMI || mongoose.model('EMI', emiSchema);
