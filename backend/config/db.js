const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Support both names during the configuration transition. Existing local
    // environments use MONGODB_URI while the original example used MONGO_URI.
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[MongoDB] Connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
