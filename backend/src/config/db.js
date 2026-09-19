import mongoose from 'mongoose';

export let isMongooseConnected = false;

// Global cached connection for serverless/lambda lifecycle reuse
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      console.warn('[Database] MONGODB_URI environment variable is not configured.');
    }
    isMongooseConnected = false;
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    isMongooseConnected = true;
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      isMongooseConnected = true;
      console.log('[Database] MongoDB Atlas connected successfully.');
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null;
      isMongooseConnected = false;
      console.warn(`[Database] MongoDB Atlas connection error: ${err.message}`);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    isMongooseConnected = true;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    isMongooseConnected = false;
    if (process.env.NODE_ENV === 'production') {
      console.error('[Database Fatal] MongoDB Atlas connection failed in production environment:', e.message);
    }
    return null;
  }
};

export const closeDB = async () => {
  if (isMongooseConnected) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    isMongooseConnected = false;
  }
};
