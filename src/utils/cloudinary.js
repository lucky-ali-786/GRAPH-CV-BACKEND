import dotenv from 'dotenv'
import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const uploadFileOnCloudinary = async (localPathFile) => {
    try {
        if (!localPathFile) return;
        cloudinary.config({
            cloud_name: "drqnl2neh",
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
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
