import 'dotenv/config';
import {app,server} from './app.js'
import connectDB from './db/db.js'
import {connection} from "./db/redis.js"
import { uploadFileOnCloudinary } from './utils/cloudinary.js';
connectDB().then(()=>{
    server.listen(process.env.PORT,()=>{
        console.log('MONGO DB IS LISTENING ON PORT 8000!')
    })
}).catch((error)=>{
    console.log('MONGO CONNECTION FAILED',error)
})
connection.on("connect", () => {
  console.log("✅ Redis connected");
});
connection.on("error", (err) => {
  console.error("❌ Redis error:", err);
});
export {app}
