import express from "express";
import { changeDP, editProfile, followToggle, getAllProfiles, getProfile, getSavedItems, removeDP } from "../controllers/profileController.js";
import { authUser } from "../middlewares/authMiddleware.js";
import { upload } from "../config/multer.js"

const router = express.Router();

router.get("/get-profile", authUser, getProfile);        
router.get("/get-profile/:id", authUser, getProfile);
router.get("/get-all-profiles", authUser, getAllProfiles)    
router.get("/saved-items", authUser, getSavedItems)    
router.delete("/remove-dp", authUser, removeDP)
router.put("/change-dp", authUser, upload.single("profilePic"), changeDP);
router.put("/edit-profile", authUser, editProfile)
router.post("/:id/follow-toggle", authUser, followToggle)


export default router;