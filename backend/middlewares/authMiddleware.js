import userModel from "../models/user.model.js"
import jwt from "jsonwebtoken";

export const authUser = async (req, res, next) => {
  
 // Extract token from cookies or Authorization header
   const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
    return res.status(401).json({ error: "No token provided. You are not authorized." });
   }

   try {
     // Verify token
     const decoded = jwt.verify(token, process.env.JWT_SECRET);
     
      // Find the user associated with the token
    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: "User not found. You are not authorized." });
    }

    req.user = user;
    // req.body.userId = user._id;
    next();

   } catch (error) {
    res.status(403).json({ error: error.message });
   }

}
