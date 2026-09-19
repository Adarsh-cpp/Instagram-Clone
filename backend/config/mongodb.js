import mongoose from "mongoose";
import userModel from "../models/user.model.js";
import Story from "../models/story.model.js";
import { startStorySweeper } from "../jobs/storySweeper.js";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB connected");
      console.log("📂 Connected to database:", mongoose.connection.name);
      console.log("🔗 Connected to host:", mongoose.connection.host);
    });

    await mongoose.connect(process.env.MONGODB_URI);

    // Ensure indexes
    await userModel.syncIndexes();
    console.log("✅ User indexes synced");

    // One-time swap of the old TTL index on stories for the plain index in
    // story.model.js. syncIndexes drops the old TTL version and creates the
    // new one; on later startups it finds nothing to change.
    await Story.syncIndexes();
    console.log("✅ Story indexes synced");

    // Expired stories are now deleted (Cloudinary file + document) by this
    // job instead of Mongo's TTL. Started only after the index sync so the
    // old TTL can't race it.
    startStorySweeper();
    console.log("✅ Story sweeper started");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

export default connectDB;
