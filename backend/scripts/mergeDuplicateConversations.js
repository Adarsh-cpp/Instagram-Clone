// scripts/mergeDuplicateConversations.js
//
// Run ONCE, after the new conversation.model.js and controllers are deployed:
//   node scripts/mergeDuplicateConversations.js
//
// BACK UP YOUR DATABASE FIRST — this deletes the duplicate conversation
// documents (their messages are moved into the oldest conversation of each pair).
import mongoose from "mongoose";
import dotenv from "dotenv";
import conversationModel from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import { buildLastMessagePreview } from "../controllers/message.controller.js";

dotenv.config();

// adjust to whatever variable your project uses for the Mongo connection string
await mongoose.connect(process.env.MONGO_URI);

const all = await conversationModel.find({}).sort({ createdAt: 1 });
const groups = new Map();

for (const c of all) {
  if (c.participants.length !== 2) continue;
  const key = c.participants.map(String).sort().join("_");
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(c);
}

for (const [key, list] of groups) {
  const [primary, ...dupes] = list; // oldest survives

  for (const dupe of dupes) {
    await messageModel.updateMany(
      { conversationId: dupe._id },
      { $set: { conversationId: primary._id } }
    );
    await conversationModel.deleteOne({ _id: dupe._id });
    console.log(`merged ${dupe._id} -> ${primary._id}`);
  }

  // recompute the list preview from the now-merged message history
  const last = await messageModel
    .findOne({ conversationId: primary._id })
    .sort({ createdAt: -1 });

  if (last) Object.assign(primary, buildLastMessagePreview(last));
  primary.participantsKey = key;
  await primary.save();
}

// make sure the unique index exists now that duplicates are gone
await conversationModel.syncIndexes();

console.log("done");
process.exit(0);
