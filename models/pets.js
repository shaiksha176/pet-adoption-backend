import mongoose from "mongoose";

const petHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  date: { type: Date, default: Date.now },
});

const fosteringSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
});

const petSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ["Cat", "Dog", "Other"],
  },
  images: [String],
  age: Number,
  gender: {
    type: String,
    enum: ["Male", "Female"],
  },
  breed: String,
  size: String,
  color: String,
  personality: String,
  description: String,
  adoptionHistory: [petHistorySchema],
  fosteringHistory: [fosteringSchema],
  status: {
    type: String,
    enum: ["Available", "Adopted", "Fostered", "Uploaded"],
    default: "Available",
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  requests: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      requestType: {
        type: String,
        enum: ["adoption", "fostering"],
      },
      requestDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const Pet = mongoose.model("Pet", petSchema);

export default Pet;
