import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    monthlyIncome: {
      type: Number,
      required: true,
      min: 0,
    },
    salaryDate: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
      default: 1,
    },
    currency: {
      type: String,
      default: '₹',
    },
    isProfileComplete: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', userSchema);
