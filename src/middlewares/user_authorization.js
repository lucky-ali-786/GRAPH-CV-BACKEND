import {User} from '../models/users.model.js'
import {asynchandler} from'../utils/asynchandler.js'
import {ApiError} from '../utils/apierror.js'
import jwt from 'jsonwebtoken'
export const VerifyJwt = asynchandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken;
        if (!token) {
            throw new ApiError(401, "Unauthorized access");
             }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if (!user) {
            throw new ApiError(401, "invalid  Access token");
        }
        req.user = user;
        next();
    }
    catch (error) {
       
        throw new ApiError(401, error.message || "Invalid token")
    }
})
