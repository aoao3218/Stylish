import redis from 'redis';
import dotenv from 'dotenv';
import { getUserByAdmin } from './data.js';

dotenv.config();
// export const client = redis.createClient();
export const client = redis.createClient({
    socket: {
        tls: true,
        host: process.env.REDIS_ENDPOINT,
        port: 6379,
    },
    password: process.env.REDIS_PASSWORD,
});
client.connect();
client.on('error', (err) => {
    console.error('Redis connection error: ', err);
});

client.on('connect', () => {
    console.log('Redis connection established successfully');
});

export const rateLimiter = async (req, res, next) => {
    const requestCountLimit = 50;
    try {
        if (!client.isReady) {
            next();
        }
        const clientIP = req.ip;
        const ips = await client.multi().incr(clientIP).expire(clientIP, 1).exec();
        const requestCount = ips[0];
        if (requestCount > requestCountLimit) {
            return res.status(429).send('Too Many Requests');
        }
        next();
    } catch (err) {
        next();
    }
};

export const cacheCampaigns = async (req, res, next) => {
    try {
        if (!client.isReady) {
            return next();
        }
        const Campaigns = await client.get('campaign');
        if (Campaigns) {
            return res.json(JSON.parse(Campaigns));
        }
        next();
    } catch (err) {
        next();
    }
};

export const checkAdminUsers = async (req, res, next) => {
    try {
        const { id } = req;
        let users;
        if (client.isReady) {
            const cacheUsers = await client.get('users');
            users = JSON.parse(cacheUsers);
            if (!cacheUsers) {
                const user = await getUserByAdmin();
                client.set('users', JSON.stringify(user));
                users = user;
            }
        } else {
            users = await getUserByAdmin();
        }
        console.log(users);
        const data = users.data;
        const foundUser = data.find((u) => u.id === id);
        if (!foundUser) {
            throw { status: 401, message: 'Unauthorized' };
        }
        next();
    } catch (err) {
        next(err);
    }
};
