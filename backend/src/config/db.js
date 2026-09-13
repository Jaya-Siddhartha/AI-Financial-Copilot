import mongoose from 'mongoose';

export let isMongooseConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fintech_copilot';

  try {
    // Attempt standard connection with 2.5s server selection timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    isMongooseConnected = true;
    console.log(`[Database] MongoDB connected successfully to ${uri}`);
  } catch (err) {
    console.warn(`[Database] Standard MongoDB server is not running (${err.message}).`);
    console.log('[Database] Active fallback: Persistent local storage engine initialized.');
    isMongooseConnected = false;
  }
};

export const closeDB = async () => {
  if (isMongooseConnected) {
    await mongoose.disconnect();
  }
};
