import mongoose from 'mongoose';

// Move this to an env var (ADMIN_EMAIL) rather than hardcoding it, so it's
// not baked into source control and can be changed without a redeploy.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "adarshpattanayak2004@gmail.com").toLowerCase();

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      required: function () { return !this.googleId; }, // Google users set it later
      minLength: [3, 'Username must be at least 3 characters'],
      maxLength: [30, 'Username must be at most 30 characters'],
  },

    fullname: {
      type: String,
      trim: true,
      required: true,
      maxLength: [50, 'Full name must be at most 50 characters'],
    },

    email: {
      type: String,
      unique: true,
      sparse: true, // <-- important: allows some users without email
      trim: true,
      lowercase: true, // <-- so email comparisons (incl. admin check) are consistent
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    profilePic: {
       type:String,
       default:""
    },

    profilePicPublicId: {
    type: String,
     default:""
    },

    phone: {
      type: String,
      match: /^[6-9]\d{9}$/, 
      maxLength: 10,
      trim: true,
      unique: true,
      sparse: true, // <-- allows users without phone
    },

    password: {
      type: String,
      minLength: [6, 'Password must be at least 6 characters'],
      select: false,  
    },

    dob: {
      type: String,
      default: "",
    },
    gender: {
       type: String,
       default: "Prefer not to say"
    },

    // For Facebook / OAuth login
    facebookId: {
      type: String,
      unique: true,
      sparse: true, // <-- allows multiple auth methods
    },

    verifyOTP: {
      type: String,
      default: "",
    },

    verifyOTPExpiresAt: {
      type: Number,
      default: 0,
    },

    isAccountVerified: {
      type: Boolean,
      default: false,
    },

    resetOTP: {
      type: String,
      default: "",
    },

    resetOTPExpiresAt: {
      type: Number,
      default: 0,
    },

    signupExpiresAt: {
      type: Date,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    bio: {
      type: String,
      maxLength: [200, 'Bio must be at most 200 characters'],
      default: "Edit the profile to add a bio....",
    },

    // "admin" is granted automatically to ADMIN_EMAIL via the pre-save hook
    // below; everyone else defaults to "user". Do not let this be set
    // directly from request bodies (e.g. via addUsername/profile-update
    // routes) — only ever set it server-side.
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    following: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

  postsCount: 
      {
        type: Number,
        default: 0,
      },

  reelsCount: 
      {
        type: Number,
        default: 0,
      },

    savedPosts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
    }],

    savedReels: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reel",
    }],

    savedItems: [
  {
    itemType: { type: String, enum: ["Post", "Reel"], required: true },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "savedItems.itemType", // resolves to Post or Reel per-document
    },
    savedAt: { type: Date, default: Date.now },
  },
],

    lastSeen: {
        type: Date,
        default: Date.now,
      },

      unreadMessages: {
      type: Number,
      default: 0,
},
  },
  { timestamps: true }
);

// ⬇️ TTL index for auto-delete of unverified signups
userSchema.index({ signupExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Auto-promote the designated admin email to role "admin" on every save.
// This covers regular signup, Google OAuth account creation, and
// addUsername (in case a Google user's email is only set/confirmed then) —
// any path that ends in .save() or .create() — without touching each
// controller individually.
userSchema.pre("save", function (next) {
  if (this.email && this.email.toLowerCase() === ADMIN_EMAIL) {
    this.role = "admin";
  }
  next();
});

const User = mongoose.model('User', userSchema);
export default User;
