import { Queue } from "bullmq";
import { connection } from "../db/redis.js";
export const mainqueue=new Queue("roast-queue",{ connection,
    defaultJobOptions:{
        removeOnComplete:true,
        attempts:3,
        backoff:{
        type:"exponential",delay:2000
       }
    }
});