import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];  // get token out of request header 

  if (!token)
    return res.status(401).json({ message: "Not authorized" });   

  const decoded = jwt.verify(token, process.env.JWT_SECRET);    // verify token and get user id from it by decoding payload
  req.user = await User.findById(decoded.id).select("-password");
  next();
};

export default protect;
