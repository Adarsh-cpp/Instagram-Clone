import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";
import transporter from "../config/nodemailer.js";




export const signup = async (req, res) => {

  const { contact, password, fullname, username } = req.body;

  // Basic presence check
  if (![contact, password, fullname, username].every(Boolean)) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // 🔍 Determine contact type once
  const isPhone = /^\d{10}$/.test(contact);          // Indian 10‑digit example
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);

  if (!isPhone && !isEmail) {
    return res.status(400).json({ message: 'Invalid email or phone number.' });
  }

  try {
    //Uniqueness checks
    const existingContact = await userModel.findOne(
      isPhone ? { phone: contact } : { email: contact }
    );
    if (existingContact) {
      return res
        .status(409)
        .json({ message: `${isPhone ? 'Phone' : 'Email'} already exists.` });
    }

    const existingUsername = await userModel.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🆕 Create user
    const user = await userModel.create({
      phone: isPhone ? contact : undefined,
      email: isPhone ? undefined : contact,
      password: hashedPassword,
      fullname,
      username,
      signupExpiresAt: new Date(Date.now() + 15 * 60 * 1000)     // 15 min window
    });

      // Generate token and set it in the cookie
      const token = generateToken(user);

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        path: "/",
        maxAge: 3600000,
      });

      // console.log(user);

    return res
      .status(201)
      .json({ success:true, token, message: 'User created successfully', id: user._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export const login = async (req, res) => {

    const {contact, password } = req.body;
    console.log(req.body)

    if(!contact || !password) {
        return res.status(400).json({ message: 'All fields are required. lala' });
    }

     // 🔍 Determine contact type once
  const isPhone = /^\d{10}$/.test(contact);          // Indian 10‑digit example
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isUsername = /^[a-zA-Z0-9_-]{4,16}$/.test(contact);

  if (!isPhone && !isEmail && !isUsername) {
    return res.status(400).json({ message: 'Invalid Credentials' });
  }
  console.log(isPhone,isEmail,isUsername);

    try {

        let query = { username: contact };
        if (isEmail) query = { email: contact };
        if (isPhone) query = { phone: contact };

        console.log(query);

        // �� Search for user in database
        const user = await userModel.findOne(query).select('+password');
        if(!user)
            return res.status(404).json({ message: 'User not found.' });

        console.log(user);

        // �� Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch)
            return res.status(401).json({ message: 'Invalid credentials.' });

        // Generate token and set it in the cookie
        const token = generateToken(user);

          res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "None",
          path: "/",
          maxAge: 3600000,
        });

        res.status(200).json({ success:true, token, message: 'Logged in successfully', user});
        
    } catch (error) {
        req.status(500).json({ message: 'Server error' });
    }
}

export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      path: "/",
    })
    res.status(200).redirect("http://localhost:5173/");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export const sendOTP = async (req, res) => {

  const userId = req.user._id;
  // console.log(userId);

  if(!userId) {
    return res.status(400).json({ message: 'Please sign in by filling necessary details' });
  }

  try {

    const user = await userModel.findById(userId);
   
    if(!user) {
      return res.status(404).json({ message: 'Please sign in by filling necessary details' });
    }

    if(user.isAccountVerified) {
      return res.status(401).json({ success:false, message:"User Already Verified" })
    }


    //Generating 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verifyOTP = otp;
    user.verifyOTPExpiresAt = Date.now() + 24 * 60 * 1000;  // 1 minute expiry
    await user.save();

    // Send OTP via SMS or email
    if(user.email){
      const mailOptions = {
      from: process.env.ADMIN_EMAIL || "adarshpattanayak2004@gmail.com",
      to: user.email,
      subject: 'Verify OTP',
      html :`
      <h4>Hi,</h4>
      <h4>Someone tried to sign up for an Instgram-clone account with <span style="font-style: italic;">${user.email}.</span>If it was you,enter this OTP.</h4>
      <h2>${otp}</h2>
      <h5 style="color:#0095f6;">This OTP will expire in 1 minute.</h5>
      `
    }
  
    await transporter.sendMail(mailOptions);
    }

    return res.status(200).json({ message: 'OTP sent successfully' });


  } catch (error) {
    res.status(500).json({ message: error.message });
  }

}

export const verifyOTP = async (req, res) => {
  
  const {otp} = req.body;
  const userId = req.user._id;

  // console.log(userId,otp)

  if(!userId){
    return res.status(400).json({ message: 'Please sign in by filling necessary details' });
  }
 
  if(!otp){
    return res.status(401).json({message: "Please provide the OTP that was sent to your email" })
  }

 try {
  
  let user = await userModel.findById(userId);

  if(!user){
      return res.status(400).json({ message: 'User not found' });
  }

  if (user.signupExpiresAt && user.signupExpiresAt < new Date()) {
      return res.status(400).json({ message: "Signup session expired, please sign up again" });
  }

  if(user.verifyOTP == "" || user.verifyOTP != otp){
    return res.status(401).json({ success:false, message:"The OTP is invalid" })
  }

  if(user.verifyOTPExpiresAt < Date.now() ){
    return res.status(401).json({ message:"OTP is expired" })
  }

  user.isAccountVerified = true;
  user.verifyOTP = "";
  user.verifyOTPExpiresAt = 0;
  user.signupExpiresAt = undefined;

  await user.save();

  return res.status(201).json({ success:true, message:"Account is verified.You can continue"})

 } catch (error) {
  return res.json({success:false,message:"Some Error Occurred"})
 }

}

export const sendResetOTP = async (req, res) => {
  
  let {contact} = req.body;

  if(!contact){
    return res.status(400).json({ sucess:false, message: "Please enter the email address or phone number" })
  }

  let user = await userModel.findOne({ $or: [{ email: contact }, { phone: contact }] });

  if(!user){
    return res.status(401).json({ success:false, message: "There is no user registered with this email id or phone number" })
  }

  // 🔍 Determine contact type once
  const isPhone = /^\d{10}$/.test(contact);          // Indian 10‑digit example
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);

  try {

        //Generating 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.resetOTP = hashedOtp;
    user.resetOTPExpiresAt = Date.now() + 5 * 60 * 1000;  // 5 minutes expiry
    await user.save();

    const resetToken = jwt.sign({email: user.email }, process.env.JWT_SECRET,{ expiresIn: "10m"} )

    if(isEmail){

        const mailOptions = {
      from: process.env.ADMIN_EMAIL || "adarshpattanayak2004@gmail.com",
      to: contact,
      subject: 'Password Reset OTP',
      html :`
      <h4>Hi,</h4>
      <h4>Sorry to hear you are having trouble logging into instagram-Clone. we got a message that you forgot your pasword. If this was you, you can get right back into your account by reseting your password to a new one.</h4>
      <h4>Your OTP to reset password is:</h4>
      <h2>${otp}</h2>
      <h5 style="color:#0095f6;">This OTP will expire in 5 minute.</h5>
      `
    }
  
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success:true, message: "Reset OTP sent successfully",resetToken })

    }
    
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message})
  }


}

export const resetPassword = async (req, res) => {
  
  let {otp, resetToken, resetPassword, confirmPassword} = req.body;
  // let userId = req.user._id;

  if(![otp, resetPassword, confirmPassword].every(Boolean)){
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if(!resetToken){
    return res.status(400).json({ message: 'Missing Token' });
  }


    let decoded = jwt.verify(resetToken, process.env.JWT_SECRET)
    
  let user = await userModel.findOne({email: decoded.email});

  if(!user){
    return res.status(400).json({ message: "You don't have an account, Please signup" })
  }


  if(resetPassword !== confirmPassword){
    return res.status(400).json({ success:false, message: "Confirm your password correctly" })
  }

  if( user.resetOTP == "" ){
    return res.status(401).json({ success:false, message:"The OTP is invalid" })
  }

  if(user.resetOTPExpiresAt < Date.now() ){
    return res.status(401).json({ message:"OTP is expired" })
  }


  try {

     
    // �� Verify OTP
        const isMatch = await bcrypt.compare(otp, user.resetOTP);

        if(!isMatch){
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

      //store the new password
        const hashedPassword = await bcrypt.hash(resetPassword, 10);
        user.password = hashedPassword;
        user.resetOTP = "";
        user.resetOTPExpiresAt = 0;
        user.isAccountVerified = true;
        await user.save();

      return res.status(200).json({ success: true, message: "Password is changed." })
    
  } catch (error) {
     return res.status(400).json({ success:false, message:error.message})
  }

}

export const addDOB = async (req, res) => {
  
  let {dob} = req.body;
  const userId = req.user._id;

  if(!dob){
    return res.status(400).json({ success:false, message:"All fields are required" })
  }

  let user = await userModel.findById(userId);

  if(!user){
    return res.status(400).json({ success:false, message: "You need to signup/login first."})
  }

  try {

    user.dob = dob;
    await user.save();

    return res.status(200).json({ success:true, message: "DOB added" })
    
  } catch (error) {
    return res.status(400).json({success:false, message: error.message});
  }

}



export const getFollowers = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id;
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const targetUser = await userModel.findById(targetUserId).select("followers");

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const pageIds = targetUser.followers.slice(skip, skip + limit);

    const populatedUsers = await userModel
      .find({ _id: { $in: pageIds } })
      .select("username profilePic fullname");

    const orderedUsers = pageIds
      .map((id) => populatedUsers.find((u) => u._id.toString() === id.toString()))
      .filter(Boolean);

    const currentUser = await userModel.findById(req.user._id).select("following");
    const currentUserFollowingSet = new Set(
      (currentUser?.following || []).map((id) => id.toString())
    );

    const followers = orderedUsers.map((u) => ({
      _id: u._id,
      username: u.username,
      profilePic: u.profilePic,
      fullName: u.fullname,
      isFollowing: currentUserFollowingSet.has(u._id.toString()),
    }));

    return res.status(200).json({
      followers,
      hasMore: skip + limit < targetUser.followers.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getFollowings = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id;
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const targetUser = await userModel.findById(targetUserId).select("following");

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const pageIds = targetUser.following.slice(skip, skip + limit);

    const populatedUsers = await userModel
      .find({ _id: { $in: pageIds } })
      .select("username profilePic fullname");

    const orderedUsers = pageIds
      .map((id) => populatedUsers.find((u) => u._id.toString() === id.toString()))
      .filter(Boolean);

    const currentUser = await userModel.findById(req.user._id).select("following");
    const currentUserFollowingSet = new Set(
      (currentUser?.following || []).map((id) => id.toString())
    );

    const following = orderedUsers.map((u) => ({
      _id: u._id,
      username: u.username,
      profilePic: u.profilePic,
      fullName: u.fullname,
      isFollowing: currentUserFollowingSet.has(u._id.toString()),
    }));

    return res.status(200).json({
      following,
      hasMore: skip + limit < targetUser.following.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};