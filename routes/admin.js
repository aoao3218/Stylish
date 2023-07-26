import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import {
    createProduct,
    createCampaign,
    getDataByCategory,
    createOrderList,
    getCampaign,
} from '../model/data.js';
import { client, checkAdminUsers } from '../model/redis.js';
import { catchToken } from '../middleware/auth.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { uploadS3 } from '../model/S3.js';

dotenv.config();

const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.BUCKET_ACCESS_KEY,
        secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
    },
    region: process.env.BUCKET_REGION,
});

const secret = process.env.SECRET;
const router = express.Router();
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename(req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage });
const cpUpload = upload.fields([
    { name: 'main_image', maxCount: 1 },
    { name: 'images', maxCount: 8 },
    { name: 'picture', maxCount: 1 },
]);
const filenameChange = (name) => `${Date.now()}-${name}`;

router.get('/product', catchToken, checkAdminUsers, (req, res) => {
    const msg = null;
    res.render('CreateProduct', { msg });
});

router.post('/product', cpUpload, async (req, res) => {
    let msg;
    const { originalname, buffer, mimetype } = req.files.main_image[0];
    const imageName = filenameChange(originalname);
    const main_image = {
        image_name: imageName,
        image_path: `products/${imageName}`,
    };
    let imageArray = null;
    if (req.files.images) {
        imageArray = req.files.images.map((file) => ({
            image_name: filenameChange(file.originalname),
            image_path: `products/${Date.now()}-${file.originalname}`,
            buffer: file.buffer,
            mimetype: file.mimetype,
        }));
    }
    // Insert the product into the database
    try {
        const product = await createProduct(req.body, main_image, imageArray);
        if (product) {
            msg = 'create Success';
        }
        const uploadKey = `products/${imageName}`;
        await uploadS3(uploadKey, buffer, mimetype);
        if (imageArray !== null) {
            const uploadKey = `products/${image.image_name}`;
            const uploadPromises = imageArray.map((image) =>
                uploadS3(uploadKey, image.buffer, image.mimetype),
            );
            await Promise.all(uploadPromises);
        }
        res.status(200).render('CreateProduct', { msg });
    } catch (err) {
        console.log(err);
        msg = err.message;
        res.send({ msg });
    }
});

router.get('/campaigns', catchToken, checkAdminUsers, async (req, res) => {
    const limit = 6;
    const paging = 0;
    let msg;
    const ProductList = await getDataByCategory('all', limit, paging);

    res.render('campaign', { msg, data: ProductList.data });
});

router.post('/campaigns', cpUpload, async (req, res) => {
    let msg;
    const { originalname, mimetype, buffer } = req.files.picture[0];
    const imageName = filenameChange(originalname);
    const picture = {
        image_name: imageName,
        image_path: `campaign/${imageName}`,
    };
    const uploadKey = `campaign/${imageName}`;

    try {
        await createCampaign(req.body, picture);
        if (client.isReady) {
            const result = await getCampaign(6, 0);
            client.set('campaign', JSON.stringify(result));
        }
        await uploadS3(uploadKey, buffer, mimetype);
        msg = 'create Success';
        res.status(200).send({ msg, ok: true });
    } catch (err) {
        msg = err.message;
        res.status(500).send({ msg, ok: false });
    }
});

router.get('/checkout', async (req, res) => {
    res.render('checkout');
});

router.post('/order/checkout', async (req, res) => {
    // get token
    // const token = req.headers.authorization.split(' ')[1]; //Authorization header 的格式是 'Bearer <token>'
    const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTEsInByb3ZpZGVyIjoibmF0aXZlIiwibmFtZSI6Ijg4NzUiLCJlbWFpbCI6Ijk5NzVAanNkamZvLmNvbSIsInBpY3R1cmUiOm51bGwsImlhdCI6MTY4MzY5NjI1NCwiZXhwIjoxNjg2Mjg4MjU0fQ.j2YVeVLSC4qu-X0cWIuVnFSgC94Cgo1Jq2UGcn5JrCo';
    if (!token) {
        throw { status: 401, message: 'Unauthorized' };
    }
    const user = jwt.verify(token, secret);
    const data = req.body;
    const { list } = req.body.order;
    const priceArray = list.map((item) => item.price);
    const total = priceArray.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    try {
        const order = await createOrderList(user, list, data, total);
        res.status(200).send({ data: { number: order } });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

router.get('/dashboard.html', async (req, res) => {
    res.render('dashboard');
});

export default router;
