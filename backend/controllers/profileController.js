import userModel from "../models/user.model.js";
import postModel from "../models/post.model.js";
import reelModel from "../models/reel.model.js";
import storyModel from "../models/story.model.js";
import conversationModel from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import highlightModel from "../models/highlight.model.js";
import notificationModel from "../models/notification.model.js";
import commentModel from "../models/comment.model.js";
import reelCommentModel from "../models/reelComment.model.js";
import cloudinary from "../config/cloudinary.js";
import { uploadSingleMedia, deleteMedia,} from "../services/upload.service.js";
import { createNotification, removeNotification } from "../services/notification.service.js";
import { getIO, onlineUsers } from "../config/socket.js";





export const getProfile = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const profileId = req.params.id 

    const id = profileId ? profileId : loggedInUserId

    const user = await userModel
      .findById(id)
      .select("-password -email"); 

    const posts = await postModel.find({author:id}).sort({createdAt:-1}).populate("author", "username profilePic fullname role")
    const reels = await reelModel.find({author:id}).sort({createdAt:-1}).populate("author", "username profilePic fullname role")

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isOwnProfile = profileId ? false : true

    const isFollowing = isOwnProfile
      ? false
      : user.followers.some(
          (followerId) => followerId.toString() === loggedInUserId.toString()
        );

    return res.status(200).json({
      success: true,
      isOwnProfile,
      isFollowing,
      user,
      posts,
      reels
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const removeDP = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🔹 Find user
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized User",
      });
    }

    // 🔹 Delete from Cloudinary (via service)
    if (user.profilePicPublicId) {
      await deleteMedia(user.profilePicPublicId);
    }

    // 🔹 Clear DB fields
    user.profilePic = "";
    user.profilePicPublicId = "";

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
      updatedUser: user,
    });

  } catch (error) {
    console.log("ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const changeDP = async (req, res) => {
  try {
    
    const userId = req.user._id;
    console.log(userId)

    // 🔹 Validate file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    // 🔹 Find user
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔹 Delete old DP (via service)
    if (user.profilePicPublicId) {
      await deleteMedia(user.profilePicPublicId);
    }

    // 🔹 Upload new DP (via service)
    const media = await uploadSingleMedia(
      req.file.buffer,
      `instagram-clone/users/${userId}/profile`,
      {
        width: 500,
        height: 500,
        crop: "fill",
      }
    );

    // 🔹 Update DB
    user.profilePic = media.url;
    user.profilePicPublicId = media.publicId;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      profilePic: user.profilePic,
      updatedUser: user,
    });

  } catch (error) {
    console.log("ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const editProfile = async (req, res) => {

      try {
          const userId = req.user._id;
        const user = await userModel.findById(userId)
        
        console.log(user)

        if(!user){
            return res.status(401).json({ success:false, message:"Unauthorized User"})
        }

        let { bio, gender } = req.body;

          if (bio && bio.length > 150) {
      return res.status(400).json({ success: false, message: "Bio too long" });
    }

          if (gender && gender.length > 150) {
      return res.status(400).json({ success: false, message: "Gender too long" });
    }


         if (bio !== undefined) user.bio = bio;
        if (gender !== undefined) user.gender = gender;
        await user.save();
        return res.status(200).json({ success:true, message:"profile edited successfully", updatedUser:user})
        
      } catch (error) {
              return res.status(500).json({ success:false, message:error.message})
      }

    
  
}

export const getAllProfiles = async (req, res) => {
  try {
    const userId = req.user._id
    const users = await userModel.find({
  _id: { $ne: userId }
});

if(users.length === 0) return res.status(404).json({success:false, message:"No users found"})

return res.status(200).json({success:true, message:"All Users fetched successfully", users})

  } catch (error) {
    return res.status(500).json({success:false, message:"Internal server error"})
  }
}

export const followToggle = async (req, res) => {
  try {
    const targetedUserId = req.params.id;
    const loggedInUserId = req.user._id;

    if (String(targetedUserId) === String(loggedInUserId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    const targetedUser = await userModel.findById(targetedUserId);
    const loggedInUser = await userModel.findById(loggedInUserId);

    if (!loggedInUser) {
      return res.status(404).json({
        success: false,
        message: "User should be logged in",
      });
    }

    if (!targetedUser) {
      return res.status(404).json({
        success: false,
        message: "Targeted user not found",
      });
    }

    const isCurrentlyFollowing = targetedUser.followers.some(
      (id) => String(id) === String(loggedInUserId)
    );

    if (isCurrentlyFollowing) {
      await Promise.all([
        userModel.findByIdAndUpdate(targetedUserId, {
          $pull: {
            followers: loggedInUserId,
          },
        }),

        userModel.findByIdAndUpdate(loggedInUserId, {
          $pull: {
            following: targetedUserId,
          },
        }),

        removeNotification({
          recipientId: targetedUserId,
          senderId: loggedInUserId,
          type: "follow",
        }),
      ]);

      const [updatedTargetedUser, updatedLoggedInUser] =
        await Promise.all([
          userModel
            .findById(targetedUserId)
            .select("followers")
            .lean(),

          userModel
            .findById(loggedInUserId)
            .select("following")
            .lean(),
        ]);

      return res.status(200).json({
        success: true,
        message: "User unfollowed",
        isFollowing: false,
        updatedFollowers: updatedTargetedUser?.followers?.length || 0,
        updatedFollowing: updatedLoggedInUser?.following?.length || 0,
      });
    }

    await Promise.all([
      userModel.findByIdAndUpdate(targetedUserId, {
        $addToSet: {
          followers: loggedInUserId,
        },
      }),

      userModel.findByIdAndUpdate(loggedInUserId, {
        $addToSet: {
          following: targetedUserId,
        },
      }),

      createNotification({
        recipientId: targetedUserId,
        senderId: loggedInUserId,
        type: "follow",
      }),
    ]);

    const [updatedTargetedUser, updatedLoggedInUser] =
      await Promise.all([
        userModel
          .findById(targetedUserId)
          .select("followers")
          .lean(),

        userModel
          .findById(loggedInUserId)
          .select("following")
          .lean(),
      ]);

    return res.status(200).json({
      success: true,
      message: "User followed",
      isFollowing: true,
      updatedFollowers: updatedTargetedUser?.followers?.length || 0,
      updatedFollowing: updatedLoggedInUser?.following?.length || 0,
    });
  } catch (error) {
    console.error("followToggle error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getSavedItems = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).populate({
      path: "savedItems.itemId",
      populate: {
        path: "author",
        select: "username profilePic isVerified role",
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const savedItems = user.savedItems
      .filter((item) => item.itemId) // drop entries whose post/reel was later deleted
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
      .map((item) => ({
        type: item.itemType, // "Post" | "Reel"
        savedAt: item.savedAt,
        ...item.itemId.toObject(),
      }));

    return res.status(200).json({ success: true, savedItems });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};







// deleteProfile.controller.js
//
// Permanently deletes the logged-in user's account and everything that
// depends on it. Add this to your user controller file.
//
// Imports this needs (keep your existing paths / names):
//   userModel, postModel, commentModel, Reel, ReelComment, storyModel,
//   highlightModel, conversationModel, messageModel, notificationModel
//   cloudinary                      (your configured cloudinary instance)
//   getIO, onlineUsers              (same ones deleteConversation uses)
//   bcrypt                          (use whichever you already use for login:
//                                    "bcrypt" or "bcryptjs")
//   import { getPublicIdFromUrl } from "../utils/mediaUtils.js";
//
// Design notes:
//  - The user document is deleted LAST and every step is idempotent, so if
//    something fails halfway the request returns 500, the account still
//    exists, and the user can simply retry — the retry finishes the cleanup.
//  - Cloudinary files are collected up front but destroyed AFTER the database
//    cleanup, in the background, so a slow Cloudinary never blocks the
//    response and never leaves DB records pointing at deleted files.

// ───────────────────────── helpers ─────────────────────────

// Deletes comments/replies written by a user, on posts OR reels.
//  - their top-level comments are removed together with ALL replies under them
//    (same rule as deleteComment)
//  - their replies are detached from the parent's replies[]
//  - the parent's commentsCount drops by the number of top-level comments
//    removed (replies never counted, see replyToComment / addComment)
//  - notifications pointing at any removed comment are deleted
const purgeAuthoredComments = async ({
  CommentModel,
  ParentModel,
  parentField, // "post" | "reel"
  notifField, // "comment" | "reelComment"
  userId,
}) => {
  const myComments = await CommentModel.find({ author: userId }).select(
    `${parentField} parentComment`
  );
  if (myComments.length === 0) return;

  const topLevel = myComments.filter((c) => !c.parentComment);
  const myReplies = myComments.filter((c) => c.parentComment);

  // replies by OTHER people underneath this user's top-level comments
  const topLevelIds = topLevel.map((c) => c._id);
  const repliesUnderMine = topLevelIds.length
    ? await CommentModel.distinct("_id", { parentComment: { $in: topLevelIds } })
    : [];

  const allIds = [
    ...new Set([
      ...myComments.map((c) => String(c._id)),
      ...repliesUnderMine.map(String),
    ]),
  ];

  // detach this user's replies from parents that will survive
  if (myReplies.length) {
    await CommentModel.updateMany(
      { _id: { $in: myReplies.map((c) => c.parentComment) } },
      { $pull: { replies: { $in: myReplies.map((c) => c._id) } } }
    );
  }

  // commentsCount: only top-level comments were ever counted
  const perParent = {};
  topLevel.forEach((c) => {
    const key = String(c[parentField]);
    perParent[key] = (perParent[key] || 0) + 1;
  });
  const countOps = Object.entries(perParent).map(([parentId, n]) => ({
    updateOne: {
      filter: { _id: parentId },
      update: { $inc: { commentsCount: -n } },
    },
  }));
  if (countOps.length) await ParentModel.bulkWrite(countOps);

  await notificationModel.deleteMany({ [notifField]: { $in: allIds } });
  await CommentModel.deleteMany({ _id: { $in: allIds } });
};

// Best-effort Cloudinary cleanup, small batches so we never hammer the API.
// Logs failures, never throws.
const destroyAssets = async (assets) => {
  const unique = [
    ...new Map(assets.map((a) => [`${a.resourceType}:${a.publicId}`, a])).values(),
  ];
  const BATCH = 5;

  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((a) =>
        cloudinary.uploader.destroy(a.publicId, { resource_type: a.resourceType })
      )
    );
    results.forEach((r, idx) => {
      if (r.status === "rejected") {
        console.log("Cloudinary delete failed:", batch[idx].publicId, r.reason);
      } else if (r.value && !["ok", "not found"].includes(r.value.result)) {
        console.log("Cloudinary unexpected result:", batch[idx].publicId, r.value);
      }
    });
  }
};

// ───────────────────── core cascade (reusable) ─────────────────────
// Also usable from an admin "delete user" route later — just pass the user doc.
// Returns what the caller needs for the follow-up work.
export const purgeUserData = async (user) => {
  const userId = user._id;

  // Cloudinary files to remove once the DB is clean
  const assets = [];
  const addAsset = (publicId, resourceType = "image") => {
    if (publicId) assets.push({ publicId, resourceType });
  };

  addAsset(user.profilePicPublicId);

  // ── 1. The user's POSTS ──────────────────────────────────────────────
  const posts = await postModel.find({ author: userId }).select("media");
  const postIds = posts.map((p) => p._id);

  if (postIds.length) {
    posts.forEach((p) =>
      p.media.forEach((m) =>
        addAsset(m.publicId, m.mediaType === "video" ? "video" : "image")
      )
    );

    // every comment/reply on these posts (from anyone) goes with them
    const commentIdsOnPosts = await commentModel.distinct("_id", {
      post: { $in: postIds },
    });

    await notificationModel.deleteMany({
      $or: [
        { post: { $in: postIds } },
        { comment: { $in: commentIdsOnPosts } },
      ],
    });
    await commentModel.deleteMany({ post: { $in: postIds } });

    // remove from everyone's saved lists
    await userModel.updateMany(
      {
        $or: [
          { savedPosts: { $in: postIds } },
          { "savedItems.itemId": { $in: postIds } },
        ],
      },
      {
        $pull: {
          savedPosts: { $in: postIds },
          savedItems: { itemType: "Post", itemId: { $in: postIds } },
        },
      }
    );

    // messageType stays "post_share" -> client shows "Post no longer available"
    await messageModel.updateMany(
      { sharedPost: { $in: postIds } },
      { $set: { sharedPost: null } }
    );

    await postModel.deleteMany({ _id: { $in: postIds } });
  }

  // ── 2. The user's REELS ──────────────────────────────────────────────
  const reels = await reelModel.find({ author: userId }).select("media.publicId");
  const reelIds = reels.map((r) => r._id);

  if (reelIds.length) {
    reels.forEach((r) => addAsset(r.media?.publicId, "video"));

    const commentIdsOnReels = await reelCommentModel.distinct("_id", {
      reel: { $in: reelIds },
    });

    await notificationModel.deleteMany({
      $or: [
        { reel: { $in: reelIds } },
        { reelComment: { $in: commentIdsOnReels } },
      ],
    });
    await reelCommentModel.deleteMany({ reel: { $in: reelIds } });

    await userModel.updateMany(
      {
        $or: [
          { savedReels: { $in: reelIds } },
          { "savedItems.itemId": { $in: reelIds } },
        ],
      },
      {
        $pull: {
          savedReels: { $in: reelIds },
          savedItems: { itemType: "Reel", itemId: { $in: reelIds } },
        },
      }
    );

    await messageModel.updateMany(
      { sharedReel: { $in: reelIds } },
      { $set: { sharedReel: null } }
    );

    await reelModel.deleteMany({ _id: { $in: reelIds } });
  }

  // ── 3. Comments the user wrote on OTHER people's posts / reels ───────
  // (runs after steps 1-2, so only comments on surviving content remain)
  await purgeAuthoredComments({
    CommentModel: commentModel,
    ParentModel: postModel,
    parentField: "post",
    notifField: "comment",
    userId,
  });
  await purgeAuthoredComments({
    CommentModel: reelCommentModel,
    ParentModel: reelModel,
    parentField: "reel",
    notifField: "reelComment",
    userId,
  });

  // ── 4. Traces the user left on other people's content ────────────────
  // (no index on these arrays, so these are collection scans — acceptable
  //  for a rare action like account deletion)
  await Promise.all([
    postModel.updateMany({ likes: userId }, { $pull: { likes: userId } }),
    commentModel.updateMany({ likes: userId }, { $pull: { likes: userId } }),
    reelCommentModel.updateMany({ likes: userId }, { $pull: { likes: userId } }),
    // reels keep denormalised counters, so decrement them together with the pull
    reelModel.updateMany(
      { likes: userId },
      { $pull: { likes: userId }, $inc: { likesCount: -1 } }
    ),
    reelModel.updateMany(
      { saves: userId },
      { $pull: { saves: userId }, $inc: { savesCount: -1 } }
    ),
    postModel.updateMany({ taggedUsers: userId }, { $pull: { taggedUsers: userId } }),
    reelModel.updateMany({ taggedUsers: userId }, { $pull: { taggedUsers: userId } }),
    storyModel.updateMany(
      { $or: [{ "likes.user": userId }, { "viewers.user": userId }] },
      { $pull: { likes: { user: userId }, viewers: { user: userId } } }
    ),
    // follow graph (User has no follower counters, only the arrays)
    userModel.updateMany({ following: userId }, { $pull: { following: userId } }),
    userModel.updateMany({ followers: userId }, { $pull: { followers: userId } }),
  ]);

  // ── 5. The user's STORIES and HIGHLIGHTS ─────────────────────────────
  const stories = await storyModel
    .find({ author: userId })
    .select("mediaPublicId mediaType");
  stories.forEach((s) =>
    addAsset(s.mediaPublicId, s.mediaType === "video" ? "video" : "image")
  );

  await highlightModel.deleteMany({ owner: userId });
  await storyModel.deleteMany({ author: userId });

  // ── 6. CONVERSATIONS and MESSAGES ────────────────────────────────────
  // Same behaviour as deleteConversation: the whole conversation goes, for
  // every participant.
  const conversations = await conversationModel
    .find({ participants: userId })
    .select("participants");
  const conversationIds = conversations.map((c) => c._id);

  const messageFilter = {
    $or: [
      { conversationId: { $in: conversationIds } },
      { senderId: userId },
      { receiverId: userId },
    ],
  };

  // Only `image` / `images` are files the chat owns. sharedStory / repliedStory
  // snapshots point at STORY files, so they are deliberately not touched.
  const messages = await messageModel.find(messageFilter).select("image images");
  messages
    .flatMap((m) => [m.image, ...(m.images || [])])
    .forEach((url) => addAsset(getPublicIdFromUrl(url)));

  await messageModel.deleteMany(messageFilter);
  await conversationModel.deleteMany({ _id: { $in: conversationIds } });

  // ── 7. NOTIFICATIONS sent to or by the user ──────────────────────────
  await notificationModel.deleteMany({
    $or: [{ recipient: userId }, { sender: userId }],
  });

  // ── 8. Finally, the user document itself ─────────────────────────────
  await userModel.deleteOne({ _id: userId });

  return {
    assets,
    // for realtime "conversationDeleted" events to the other participants
    conversations: conversations.map((c) => ({
      id: c._id.toString(),
      peers: c.participants
        .map((p) => p.toString())
        .filter((p) => p !== userId.toString()),
    })),
  };
};

// ───────────────────────── controller ─────────────────────────
export const deleteProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body || {};

    const user = await userModel.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Re-authenticate: deleting an account is irreversible, so a stolen or
    // left-open session shouldn't be enough. Google-only accounts have no
    // password and skip this check.
    if (user.password) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Password is required to delete your account",
        });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Incorrect password" });
      }
    }

    const { assets, conversations } = await purgeUserData(user);

    // tell anyone currently online that their conversation with this user is gone
    try {
      const io = getIO();
      conversations.forEach(({ id, peers }) => {
        peers.forEach((peerId) => {
          const entry = onlineUsers.get(peerId);
          if (!entry) return;
          const payload = { conversationId: id, deletedBy: userId.toString() };
          if (entry instanceof Set) {
            entry.forEach((socketId) => io.to(socketId).emit("conversationDeleted", payload));
          } else {
            io.to(entry).emit("conversationDeleted", payload);
          }
        });
      });
    } catch (socketErr) {
      console.log("Account deletion socket notify failed:", socketErr.message);
    }

    // log the user out — use the same cookie name/options you set at login
    res.clearCookie("token");

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });

    // Cloudinary cleanup runs after the response, in the background
    destroyAssets(assets).catch((err) =>
      console.log("Account media cleanup failed:", err)
    );
  } catch (error) {
    // The user document is deleted last, so a failure here leaves the account
    // intact and the request can safely be retried.
    console.error("Delete Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete account. Please try again.",
    });
  }
};





