import userModel from "../models/user.model.js";
import postModel from "../models/post.model.js";
import cloudinary from "../config/cloudinary.js";
import { uploadSingleMedia, deleteMedia,} from "../services/upload.service.js";
import { createNotification, removeNotification } from "../services/notification.service.js";
import reelModel from "../models/reel.model.js";




export const getProfile = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const profileId = req.params.id 

    const id = profileId ? profileId : loggedInUserId

    const user = await userModel
      .findById(id)
      .select("-password -email"); 

    const posts = await postModel.find({author:id}).sort({createdAt:-1}).populate("author", "username profilePic fullname")
    const reels = await reelModel.find({author:id}).sort({createdAt:-1}).populate("author", "username profilePic fullname")

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

    const targetedUser = await userModel.findById(targetedUserId);
    const loggedInUser = await userModel.findById(loggedInUserId);

    if (!loggedInUser) {
      return res.status(404).json({ success: false, message: "User should be logged in" });
    }
    if (!targetedUser) {
      return res.status(404).json({ success: false, message: "Targeted user not found" });
    }

    const isCurrentlyFollowing = targetedUser.followers.some(
      id => id.toString() === loggedInUserId.toString()
    );

    if (isCurrentlyFollowing) {
      await userModel.findByIdAndUpdate(targetedUserId, { $pull: { followers: loggedInUserId } });
      await userModel.findByIdAndUpdate(loggedInUserId, { $pull: { following: targetedUserId } });

      await removeNotification({ recipientId: targetedUserId, senderId: loggedInUserId, type: "follow" });

      return res.status(200).json({
        success: true,
        message: "User unfollowed",
        isFollowing: false,
        updatedFollowers: targetedUser.followers.length - 1,
        updatedFollowing: loggedInUser.following.length - 1
      });
    }

    await userModel.findByIdAndUpdate(targetedUserId, { $addToSet: { followers: loggedInUserId } });
    await userModel.findByIdAndUpdate(loggedInUserId, { $addToSet: { following: targetedUserId } });

    await createNotification({ recipientId: targetedUserId, senderId: loggedInUserId, type: "follow" });

    return res.status(200).json({
      success: true,
      message: "User followed",
      isFollowing: true,
      updatedFollowers: targetedUser.followers.length + 1,
      updatedFollowing: loggedInUser.following.length + 1
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getSavedItems = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).populate({
      path: "savedItems.itemId",
      populate: {
        path: "author",
        select: "username profilePic isVerified",
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





