const mongoose = require('mongoose');

// Generic atomic counter collection.
// _id = a namespaced key, e.g. "cattleId:IND:KA" or "medicalEvent"
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomically increments and returns the next sequence number for a given key.
 * Safe under concurrent requests (findOneAndUpdate is atomic in MongoDB).
 */
async function getNextSequence(key) {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

module.exports = { Counter, getNextSequence };
