import IORedis from "ioredis";
export const connection = new IORedis({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  host: "redis-15744.c278.us-east-1-4.ec2.cloud.redislabs.com",
  port: 15744,
  ttl:{},
maxRetriesPerRequest: null,
});