import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"
const uploadFileOnCloudinary = async (localPathFile) => {
    try {
        if (!localPathFile) return;
        cloudinary.config({
            cloud_name: "drqnl2neh",
            api_key: "576688877965963",
            api_secret: "N1KFC-CZwzlXDjM4j_XXEoRhPB8"
        });
        const response = await cloudinary.uploader.upload(localPathFile, {
            resource_type: "auto"
        })
        fs.unlinkSync(localPathFile)
        return response
    }
    catch (error) {
        if (fs.existsSync(localPathFile)) {
             fs.unlinkSync(localPathFile)
        }
        return null
    }
}
export { uploadFileOnCloudinary }