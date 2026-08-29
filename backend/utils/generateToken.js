import jwt from "jsonwebtoken";

// Generate a token for the user
const generateToken = (user) => {
  return jwt.sign(
    { email: user.email, id: user._id }, // Payload
    process.env.JWT_SECRET || "shhhhhhh", // Secret from environment or fallback
    { expiresIn: "24h" } // Set token expiration time (e.g., 1 hour)
  );
};

export default generateToken;
