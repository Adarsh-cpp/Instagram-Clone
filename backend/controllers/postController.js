import cloudinary from "../config/cloudinary.js";
import postModel from "../models/post.model.js";
import userModel from "../models/user.model.js";
import messageModel from "../models/message.model.js";
import commentModel from "../models/comment.model.js";
import { createNotification, removeNotification } from "../services/notification.service.js";
import { uploadMultipleMedia } from "../services/upload.service.js";

const MAX_IMAGES = 5;

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createPost = async (req, res) => {
  try {
    const { caption, ratio, location, taggedUsers } = req.body;
    const userId = req.user._id;
    const files = req.files; 

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one image",
      });
    }

    if (files.length > MAX_IMAGES) {
      return res.status(400).json({
        success: false,
        message: `A post can have at most ${MAX_IMAGES} images`,
      });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // location arrives as a JSON string since FormData only carries strings
    let parsedLocation;
    if (location) {
      try {
        const loc = JSON.parse(location);
        if (loc?.name && loc?.lat != null && loc?.lng != null) {
          parsedLocation = { name: loc.name, lat: loc.lat, lng: loc.lng };
        }
      } catch {
        // malformed location payload — just skip it, don't fail the whole post
      }
    }

    // taggedUsers arrives as a JSON-stringified array of user ids
    let taggedUserIds = [];
    if (taggedUsers) {
      try {
        const ids = JSON.parse(taggedUsers);
        if (Array.isArray(ids) && ids.length > 0) {
          const existing = await userModel.find({ _id: { $in: ids } }).select("_id");
          taggedUserIds = existing
            .map((u) => u._id.toString())
            .filter((id) => id !== userId.toString());
        }
      } catch {
        // malformed tag payload — skip it
      }
    }

    const folder = `instagram-clone/users/${req.user._id}/images`;
    const media = await uploadMultipleMedia(files, folder, { resource_type: "image" });

    const post = await postModel.create({
      caption: caption || "",
      aspectRatio: ratio || "1:1",
      media,
      author: req.user._id,
      ...(parsedLocation && { location: parsedLocation }),
      taggedUsers: taggedUserIds,
    });

    user.postsCount = user.postsCount + 1;
    await user.save();

    // notify anyone the author tagged
    await Promise.all(
      taggedUserIds.map((tid) =>
        createNotification({
          recipientId: tid,
          senderId: userId,
          type: "tag",
          postId: post._id,
        }).catch(() => {})
      )
    );

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error("Create Post Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create post",
      error: error.message,
    });
  }
};

export const getFeedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 30);
    const cursor = req.query.cursor; // base64 of { createdAt, _id } from the last post of the previous page

    const user = await userModel.findById(userId).select("savedPosts");
    const savedPosts = user.savedPosts.map((id) => id.toString());

    const matchStage = {};

    if (cursor) {
      let decoded;
      try {
        decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
      } catch {
        return res.status(400).json({ success: false, message: "Invalid cursor" });
      }

      const cursorDate = new Date(decoded.createdAt);
      matchStage.$or = [
        { createdAt: { $lt: cursorDate } },
        { createdAt: cursorDate, _id: { $lt: decoded._id } },
      ];
    }

    const posts = await postModel.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit + 1 },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },
      {
        $lookup: {
          from: "users",
          localField: "taggedUsers",
          foreignField: "_id",
          as: "taggedUsers",
        },
      },
      {
        $project: {
          caption: 1,
          media: 1,
          aspectRatio: 1,
          likes: 1,
          commentsCount: 1,
          createdAt: 1,
          location: 1,
          "author._id": 1,
          "author.username": 1,
          "author.profilePic": 1,
          "taggedUsers._id": 1,
          "taggedUsers.username": 1,
          "taggedUsers.profilePic": 1,
        },
      },
    ]);

    const hasMore = posts.length > limit;
    const pagePosts = hasMore ? posts.slice(0, limit) : posts;

    const updatedPosts = pagePosts.map((post) => ({
      ...post,
      isSaved: savedPosts.includes(post._id.toString()),
    }));

    let nextCursor = null;
    if (hasMore && pagePosts.length > 0) {
      const last = pagePosts[pagePosts.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({ createdAt: last.createdAt, _id: last._id })
      ).toString("base64");
    }

    return res.status(200).json({
      success: true,
      posts: updatedPosts,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleLikes = async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const alreadyLiked = post.likes.includes(req.user._id);

    if (alreadyLiked) {
      post.likes.pull(req.user._id);
      await removeNotification({ recipientId: post.author, senderId: req.user._id, type: "like", postId: post._id });
    } else {
      post.likes.push(req.user._id);
      await createNotification({ recipientId: post.author, senderId: req.user._id, type: "like", postId: post._id });
    }

    await post.save();

    res.json({
      success: true,
      likesCount: post.likes.length,
      liked: !alreadyLiked,
    });
  } catch (error) {
    console.error("Toggle Like Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const postComment = async (req, res) => {
  try {
    const text = req.body.comment;
    const author = req.user?._id;
    const postId = req.params.id;

    if (!author) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot be empty",
      });
    }

    const post = await postModel.findById(postId)

      if (!post) {
      return res.status(400).json({
        success: false,
        message: "Post not found",
      });
    }

    const comment = await commentModel.create({
      text: text.trim(),
      author,
      post,
    });
    post.commentsCount = post.commentsCount + 1
    await post.save()

    await createNotification({
      recipientId: post.author,
      senderId: author,
      type: "comment",
      postId: post._id,
      commentId: comment._id,
      commentText: text,
    });

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment,
    });
  } catch (error) {
    console.error("Post Comment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const getComments = async (req, res) => {
  const postId = req.params.id;

  try {
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const comments = await commentModel
      .find({ post: postId })
      .populate("author", "username profilePic")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await postModel.find().populate("author").populate("likes")

    if(posts.length == 0) return res.status(404).json({success:false, message:"No Posts Found"})

    return res.status(200).json({success:true, message:"All Posts fetched succesfully", posts})

  } catch (error) {
   return res.status(500).json({success:false, message:"Internal server error"})
  }
}

export const toggleSavePosts = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await postModel.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "No posts found" });

    const user = await userModel.findById(req.user._id);
    const alreadySaved = user.savedItems.some(
      (item) => item.itemType === "Post" && item.itemId.toString() === postId
    );

    if (alreadySaved) {
      user.savedItems = user.savedItems.filter(
        (item) => !(item.itemType === "Post" && item.itemId.toString() === postId)
      );
      user.savedPosts.pull(postId);
    } else {
      user.savedItems.push({ itemType: "Post", itemId: postId, savedAt: new Date() });
      user.savedPosts.addToSet(postId);
    }

    await user.save();
    return res.status(200).json({ success: true, alreadySaved, message: "Saved posts toggled successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getSavedPosts = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await userModel
            .findById(userId)
            .populate({
                path: "savedPosts",
                populate: {
                    path: "author",
                    select: "username profileImage"
                }
            });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            savedPosts: user.savedPosts
        });

    } catch (error) {
        console.log(error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const deletePost = async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this post" });
    }

    await Promise.all(
      post.media.map((m) =>
        cloudinary.uploader.destroy(m.publicId, {
          resource_type: m.mediaType === "video" ? "video" : "image",
        })
      )
    );

    await commentModel.deleteMany({ post: post._id });

    await userModel.updateMany(
      {},
      {
        $pull: {
          savedPosts: post._id,
          savedItems: { itemType: "Post", itemId: post._id },
        },
      }
    );

    await messageModel.updateMany(
      { sharedPost: post._id },
      { $set: { sharedPost: null } }
    );

    await userModel.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });

    await post.deleteOne();

    return res.status(200).json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error("Delete Post Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete post" });
  }
};

// ---- new: location search (proxies OpenStreetMap's free Nominatim API) ----
export const searchLocations = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      return res.status(200).json({ success: true, results: [] });
    }

    console.log("running")

    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
        const response = await fetch(url, {
        headers: {
          "User-Agent": "Instagram-Clone/1.0 (adarshpattanayak2004@gmail.com)",
          "Referer": "http://localhost:5173", // your actual frontend origin
        },
      });

    console.log("Nominatim status:", response.status);

    if (!response.ok) {
      return res.status(200).json({ success: true, results: [] });
    }

    const data = await response.json();

    const results = data.map((place) => ({
      name: place.display_name.split(",").slice(0, 2).join(",").trim(),
      subtitle: place.display_name,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
    }));

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Search Location Error:", error);
    // fail soft — a broken location search shouldn't block post creation
    return res.status(200).json({ success: true, results: [] });
  }
};

export const reverseGeocodeLocation = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (lat == null || lng == null) {
      return res.status(400).json({ success: false, message: "lat and lng are required" });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Instagram-Clone/1.0 (adarshpattanayak2004@gmail.com)" },
    });

    if (!response.ok) {
      return res.status(200).json({
        success: true,
        name: `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`,
      });
    }

    const data = await response.json();
    const name = data?.display_name
      ? data.display_name.split(",").slice(0, 2).join(",").trim()
      : `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;

    return res.status(200).json({ success: true, name });
  } catch (error) {
    console.error("Reverse Geocode Error:", error);
    return res.status(200).json({
      success: true,
      name: `${Number(req.query.lat).toFixed(4)}, ${Number(req.query.lng).toFixed(4)}`,
    });
  }
};

// ---- new: search users to tag ----
export const searchUsersToTag = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      return res.status(200).json({ success: true, users: [] });
    }

    const regex = new RegExp(escapeRegex(q), "i");

    const users = await userModel
      .find({
        _id: { $ne: req.user._id },
        $or: [{ username: regex }, { fullname: regex }],
      })
      .select("username fullname profilePic")
      .limit(15);

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Search Users Error:", error);
    return res.status(500).json({ success: false, message: "Failed to search users" });
  }
};

// ---- new: suggested people to tag (author's followers) ----
export const getSuggestedTagUsers = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user._id)
      .populate("followers", "username fullname profilePic");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, users: user.followers.slice(0, 20) });
  } catch (error) {
    console.error("Suggested Tag Users Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch suggestions" });
  }
};
