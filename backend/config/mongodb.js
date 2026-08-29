import mongoose from "mongoose";
import userModel from "../models/user.model.js";

const connectDB = async () => {
  try {
    // Attach before connecting
    // console.log(process.env.MONGODB_URI);
   
    mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));

    await mongoose.connect(process.env.MONGODB_URI);

    // Ensure indexes
    await userModel.syncIndexes();
    console.log("✅ User indexes synced");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

export default connectDB;
