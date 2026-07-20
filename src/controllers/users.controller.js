import { asynchandler } from "../utils/asynchandler.js";
import { User } from "../models/users.model.js";
import { ApiError } from "../utils/apierror.js";
import { Apiresponse } from '../utils/Apiresponse.js';
import jwt from "jsonwebtoken";

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); 
        return { accessToken, refreshToken }; 
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens");
    }
}
const cookieOptions = {
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", 
};

const register = asynchandler(async (req, res) => {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email: email });
    if (exists) {
        throw new ApiError(400, "USER ALREADY EXISTS PLEASE LOGIN");
    }
    const user = new User({
        name: name,
        email: email,
        password: password,
    });
    
    await user.save();
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);
    const createdUser = await User.findById(user._id).select("-password");

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new Apiresponse(
                200,
                { user: createdUser, accessToken, refreshToken },
                "User registered Successfully"
            )
        );
})

const login = asynchandler(async (req, res, next) => {
    const { email, password} = req.body;
    if (!email || !password) {
        throw new ApiError(400, "FIELDS REQUIRED");
    }
    const exists = await User.findOne({ email: email }).select("+password");
    if (!exists) {
        throw new ApiError(400, "USER DOES NOT EXIST PLEASE REGISTER FIRST");
    }
    
    const comppass = await exists.isPasswordcorrect(password);
    if (!comppass) {
        throw new ApiError(400, "PASSWORD INCORRECT");
    }
    
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(exists._id);
    const loggedin = await User.findById(exists._id).select("-password -refreshToken");
    
    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new Apiresponse(
                200,
                {
                    user: loggedin, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        );
})

const logout = asynchandler(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user._id, {
        $unset: {
            refreshToken: 1
        },
    }, {
        new: true
    });
    
    // Ensure the exact same options are used to clear the cookie
    return res
        .status(200)
        .clearCookie('accessToken', cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new Apiresponse(200, {}, "USER LOGGED OUT SUCCESSFULLY"));
})

const getcurrentuser = asynchandler(async (req, res, next) => {
    if(!req.user){
        throw new ApiError(400,"User not logged in");
    }
    const user = await User.findById(req.user._id).select("-password");
    return res.status(200).json(new Apiresponse(200, user, "user fetched successfully"));
})

export {
    register,
    login,
    logout,
    getcurrentuser,
}