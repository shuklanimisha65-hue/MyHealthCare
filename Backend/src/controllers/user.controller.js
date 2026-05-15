// controllers/authController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

//Helper: Generate Tokens
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};

//Register user
export const registerUser = asyncHandler(async (req, res) => {
    console.log('Registration request received');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    const {
        username,
        fullName,
        email,
        password,
        dateOfBirth,
        gender,
        phone,
    } = req.body;

    //Validation
    if ([username, email, fullName, password, dateOfBirth, gender].some(
        (field) => !field || field?.trim() === ""
    )) {
        throw new ApiError(400, "All required fields must be provided");
    }

    //Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Invalid email format");
    }

    //Validate password length
    if (password.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters long");
    }


    //Check if user already exists
    console.log('Checking if user exists...');
    const existedUser = await User.findOne({
        $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    console.log('No existing user found');

    //Handle avatar upload
    let avatarUrl = null;

    if (req.file) {
        console.log('Avatar file received:', req.file.originalname);

        try {
            avatarUrl = await uploadOnCloudinary(req.file.path);
            console.log('Avatar uploaded to Cloudinary:', avatarUrl);
        } catch (error) {
            console.log('Cloudinary upload failed:', error.message);
            throw new ApiError(500, "Failed to upload avatar image");
        }
    } else {
        console.log('No avatar uploaded - will use default');
    }

    //Create user in database
    console.log('Creating user in database...');

    const user = await User.create({
        username: username.toLowerCase(),
        fullName,
        email: email.toLowerCase(),
        password,
        dateOfBirth,
        gender: gender.toLowerCase(),
        phone: phone || undefined,
        avatar: avatarUrl
    });

    console.log('User created successfully!');
    console.log('User ID:', user._id);

    //Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    //Get user without sensitive fields
    const userResponse = user.getPublicProfile();

    //Cookie options
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    };

    //Send response with cookies
    res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                {
                    user: userResponse,
                    accessToken,
                    refreshToken
                },
                'User registered successfully'
            )
        );

    console.log('Registration complete!');
});

//Login user
export const loginUser = asyncHandler(async (req, res) => {
    console.log('Login request received');

    const { emailOrUsername, password } = req.body || {}; //explain this 

    //Validate input
    if (!emailOrUsername || !password) {
        throw new ApiError(400, 'Email/Username and password are required');
    }

    //Find user by email OR username
    const user = await User.findOne({
        $or: [
            { email: emailOrUsername.toLowerCase() },
            { username: emailOrUsername.toLowerCase() }
        ]
    }).select('+password'); 

    if (!user) {
        throw new ApiError(401, 'Invalid credentials');
    }

    //Check if account is active
    if (!user.isActive) {
        throw new ApiError(403, 'Account is deactivated. Please contact support.');
    }

    //Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid credentials');
    }

    console.log('Login successful for user:', user.username);

    //Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    //Get user without password
    const userResponse = user.getPublicProfile();

    //Cookie options
    const options = {
        httpOnly: true,
        secure:true,
    };

    //Send response with cookies
    res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: userResponse,
                    accessToken,
                    refreshToken
                },
                'Login successful'
            )
        );
}); //i have written the generate tokens in register user but also in login user ...so i need to know why two times 

//Logout user
export const logoutUser = asyncHandler(async (req, res) => {
    //Remove refresh token from database
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 }
        },
        { new: true } //what does this mean in this method findByIdandUpdate
    );

    //Cookie options
    const options = {
        httpOnly: true,
        secure: true
    };

    //Clear cookies and send response
    res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, null, 'Logged out successfully')
        );
});

//Refresh access token
export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken; //what does this mean 

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        //Verify refresh token
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        //Find user
        const user = await User.findById(decodedToken._id);
        //why id here ?

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        //Check if refresh token matches
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        //Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        //Cookie options
        const options = {
            httpOnly: true,
            secure: true
        };

        //Send response
        res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

//Get current user
export const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    res.status(200).json(
        new ApiResponse(200, user.getPublicProfile(), 'User fetched successfully')
    );
});

//Change password
export const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    //Validate input
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, 'Old and new passwords are required');
    }

    if (newPassword.length < 8) {
        throw new ApiError(400, 'New password must be at least 8 characters');
    }

    //Get user with password
    const user = await User.findById(req.user._id).select('+password');

    //Verify old password
    const isPasswordValid = await user.comparePassword(oldPassword);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Old password is incorrect');
    }

    //Update password
    user.password = newPassword;
    await user.save();

    console.log('Password changed for user:', user.username);

    res.status(200).json(
        new ApiResponse(200, null, 'Password changed successfully')
    );
});

//Update profile
export const updateProfile = asyncHandler(async (req, res) => {
    const { phone, bloodGroup, dailyStepsGoal, dailyWaterGoal } = req.body;

    const updates = {};

    if (phone) updates.phone = phone;
    if (bloodGroup) updates.bloodGroup = bloodGroup;
    if (dailyStepsGoal) updates.dailyStepsGoal = dailyStepsGoal;
    if (dailyWaterGoal) updates.dailyWaterGoal = dailyWaterGoal;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
    );

    res.status(200).json(
        new ApiResponse(200, user.getPublicProfile(), 'Profile updated successfully')
    );
});

//Update avatar
export const updateAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'Avatar image is required');
    }

    console.log('Uploading new avatar...');

    //Upload to Cloudinary
    const avatarUrl = await uploadOnCloudinary(req.file.path);

    //Update user
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: avatarUrl },
        { new: true }
    );

    console.log('Avatar updated for user:', user.username);

    res.status(200).json(
        new ApiResponse(200, { avatar: avatarUrl }, 'Avatar updated successfully')
    );
});
