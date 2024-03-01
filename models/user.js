import mongoose from "mongoose";

const adoptionHistorySchema = new mongoose.Schema({
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pet",
  },
  adoptionDate: { type: Date, default: Date.now },
});

const fosteringHistorySchema = new mongoose.Schema({
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pet",
  },
  fosterStartDate: { type: Date, default: Date.now },
  fosterEndDate: Date,
});

const applicationHistorySchema = new mongoose.Schema({
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pet",
  },
  applicationDate: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: String,
  address: String,
  adoptionHistory: [adoptionHistorySchema],
  fosteringHistory: [fosteringHistorySchema],
  applicationHistory: [applicationHistorySchema]
});

const User = mongoose.model("User", userSchema);

export default User;
