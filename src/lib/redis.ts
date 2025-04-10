import Redis, { Redis as RedisType } from 'ioredis';

interface Question {
    id: string;
}

class RedisClient {
    private static instance: RedisType;
    private static maxRetries = 10;
    private static retryCount = 0;
    private static connectionFailed = false;

    private constructor() { }

    public static getInstance(): RedisType {
        if (!RedisClient.instance) {
            const redisUrl = process.env.REDIS_URL;
            if (!redisUrl) {
                throw new Error('REDIS_URL is not defined');
            }

            RedisClient.instance = new Redis(redisUrl, {
                database: 1,
                maxRetriesPerRequest: 3,
                retryStrategy(times) {
                    const delay = Math.min(times * 500, 2000);
                    return delay;
                }
            });

            // Add event listeners
            RedisClient.instance.on('error', (err) => {
                console.log('Redis error:', err);
            });

            RedisClient.instance.on('connect', () => {
                console.log('Redis connected');
                RedisClient.retryCount = 0;
                RedisClient.connectionFailed = false;
            });

            RedisClient.instance.on('reconnecting', () => {
                RedisClient.retryCount++;
                if (RedisClient.retryCount > RedisClient.maxRetries) {
                    console.log('Max Redis reconnection attempts reached - connection unstable');
                    RedisClient.connectionFailed = true;
                }
                console.log(`Redis reconnecting... Attempt ${RedisClient.retryCount}`);
            });
        }
        return RedisClient.instance;
    }
}


export const redis = RedisClient.getInstance();
