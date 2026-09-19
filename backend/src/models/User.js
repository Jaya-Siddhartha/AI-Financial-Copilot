import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    id: {
      type: String,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    phoneOnly: {
      type: String,
      index: true,
      trim: true,
    },
    upiId: {
      type: String,
      index: true,
      trim: true,
    },
    upiPin: {
      type: String,
      default: '1234',
    },
    monthlyIncome: {
      type: Number,
      required: true,
      min: 0,
      default: 50000,
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
    _id: false,
  }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
