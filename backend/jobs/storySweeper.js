// jobs/storySweeper.js
//
// Replaces Mongo's TTL index for stories. The TTL deleted documents silently,
// so the Cloudinary file of every naturally-expired story was orphaned. This
// job deletes the Cloudinary asset FIRST and the document second, and only
// removes the document if Cloudinary confirmed — otherwise it retries on the
// next run.
//
// Setup:
//   1. npm i node-cron
//   2. call startStorySweeper() once, after your DB connection is ready
//   3. in story.model.js replace the TTL index with a plain one:
//        storySchema.index({ expiresAt: 1 });
//      and drop the old TTL index once: db.stories.dropIndex("expiresAt_1")
//      (if the TTL index stays, it deletes docs before this job sees them)

import cron from "node-cron";
import cloudinary from "../config/cloudinary.js";
import Story from "../models/story.model.js";

let running = false; // prevents overlapping runs if one takes long

export const startStorySweeper = () => {
  cron.schedule("*/5 * * * *", async () => {
    if (running) return;
    running = true;

    try {
      // highlighted stories are protected — same rule the old partial TTL had
      const expired = await Story.find({
        expiresAt: { $lte: new Date() },
        isHighlighted: false,
      })
        .limit(200)
        .select("mediaPublicId mediaType");

      for (const story of expired) {
        try {
          const result = await cloudinary.uploader.destroy(story.mediaPublicId, {
            resource_type: story.mediaType === "video" ? "video" : "image",
          });

          if (result.result === "ok" || result.result === "not found") {
            await Story.deleteOne({ _id: story._id });
          } else {
            console.log("Story sweep: unexpected Cloudinary result", story._id, result);
          }
        } catch (err) {
          console.log("Story sweep failed, will retry:", story._id, err.message);
        }
      }
    } catch (err) {
      console.log("Story sweeper error:", err.message);
    } finally {
      running = false;
    }
  });
};
