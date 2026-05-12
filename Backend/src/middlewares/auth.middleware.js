import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT=asyncHandler(async(req,res,next)=>{
    const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","").trim()

    if(!token){
        throw new ApiError(401,"Unauthorised Access")
    }

    let decodedToken
    try {
        decodedToken=jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
    } catch (error) {
        throw new ApiError(401,"Invalid or expired access token")
    }

    const user=await User.findById(decodedToken?._id).select("-password -refreshToken")

    if(!user){
        throw new ApiError(401,"Invalid access token")
    }

    req.user=user;
    next()
})