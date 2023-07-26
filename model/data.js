import mysql from 'mysql2';
import axios from 'axios';
import dotenv from 'dotenv';
import NotFoundError from './error.js';

dotenv.config();
const partnerKey = process.env.partner_key;
const merchantId = process.env.merchant_id;
// create the connection to database
const pool = mysql
    .createPool({
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        waitForConnections: true,
        connectionLimit: 10,
    })
    .promise();

const TapPay = async (data, total) => {
    const check = await axios({
        method: 'post',
        url: 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': partnerKey,
        },
        responseType: 'json',
        data: {
            prime: data.prime,
            partner_key: partnerKey,
            merchant_id: merchantId,
            details: 'TapPay Order Test',
            amount: total,
            cardholder: {
                phone_number: data.order.recipient.phone,
                name: data.order.recipient.name,
                email: data.order.recipient.email,
                address: data.order.recipient.address,
            },
            remember: false,
        },
    });
    return check.data;
};

export const createOrderList = async (user, list, data, total) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const listId = list.map((item) => item.id);
        const [allListProduct] = await connection.query(
            'SELECT * FROM variants WHERE product_id in ?;',
            [[listId]],
        );
        const isAllProductsExist = list.every((item) => {
            const product = allListProduct.find(
                (p) =>
                    p.product_id === parseInt(item.id, 10) &&
                    p.size === item.size &&
                    p.color_name === item.color.name &&
                    p.color_code === item.color.code,
            );
            return product && product.stock >= item.qty;
        });

        if (!isAllProductsExist) {
            throw new Error('有商品無庫存');
        }

        // Update Products
        list.forEach(async (item) => {
            const id = parseInt(item.id, 10);
            const { stock } = allListProduct.find(
                (p) =>
                    p.product_id === id &&
                    p.size === item.size &&
                    p.color_name === item.color.name &&
                    p.color_code === item.color.code,
            );
            const newStock = stock - item.qty;
            await connection.query(
                'UPDATE variants SET stock = ? WHERE product_id = ? and color_code =? and size =?',
                [newStock, id, item.color.code, item.size],
            );
        });

        // Pay
        const pay = await TapPay(data, total);
        let status;
        if (pay.status === 200) {
            status = '已付款';
        } else {
            status = '未付款';
        }

        // create orders
        const recipient = JSON.stringify(data.order.recipient);
        const [order] = await connection.query(
            'INSERT INTO orders (user_id, total,recipient,status) VALUES (?,?,?,?)',
            [user.id, total, recipient, status],
        );
        const number = order.insertId;

        // create order_details
        const orders = list.reduce((acc, item) => {
            const arr = [number, item.id, item.color.code, item.size, item.qty, item.price];
            acc.push(arr);
            return acc;
        }, []);
        await connection.query(
            'INSERT INTO order_details (order_id,product_id, color_code,size,quantity,price) VALUES ?',
            [orders],
        );

        await connection.commit();
        return number;
    } catch (err) {
        await connection.rollback();
        throw err;
    }
};

const getVariantById = async (product_id) => {
    const [result] = await pool.query(
        'SELECT color_code,size,stock FROM variants WHERE product_id = ?',
        [product_id],
    );
    return result;
};

const sizeArray = async (product_id) => {
    const [size] = await pool.query('SELECT size FROM variants WHERE product_id = ?', [product_id]);
    const sizes = [...new Set(size.map((item) => item.size))];
    return sizes;
};

const getColorById = async (product_id) => {
    const [colors] = await pool.query(
        'SELECT color_name ,color_code FROM variants WHERE product_id = ?',
        [product_id],
    );
    const colorArray = [...new Set(colors.map((color) => JSON.stringify(color)))].map((color) =>
        JSON.parse(color),
    );
    return colorArray;
};

const getImageById = async (product_id, type) => {
    const [Image] = await pool.query(
        'SELECT image_path FROM images WHERE product_id = ? AND image_type = ?',
        [product_id, type],
    );
    let images = Image.map((Obj) => `https://dhdljwkfzbvno.cloudfront.net/${Obj.image_path}`);
    if (images.length === 0) {
        images = null;
    } else if (images.length === 1) {
        const path = images[0];
        images = path;
    }
    return images;
};

const mergerData = async (product) => {
    const p_id = product.id;
    const variant = await getVariantById(p_id);
    const size = await sizeArray(p_id);
    const color = await getColorById(p_id);
    const mainImage = await getImageById(p_id, 'main');
    const otherImages = await getImageById(p_id, 'other');

    return {
        ...product,
        colors: color,
        sizes: size,
        variants: variant,
        main_image: mainImage,
        images: otherImages,
    };
};

export const createVariants = async (variants) => {
    const [result] = await pool.query(
        'INSERT INTO variants (product_id,color_name,color_code, size, stock) VALUES ?',
        [variants],
    );
    return result;
};

export const createImages = async (images) => {
    const [result] = await pool.query(
        'INSERT INTO images (product_id,image_name,image_path,image_type) VALUES ?',
        [images],
    );
    return result;
};

export const createProduct = async (data, main_image, imageArray) => {
    const {
        category,
        title,
        description,
        size,
        stock,
        price,
        color_name,
        color_code,
        texture,
        wash,
        place,
        note,
        story,
    } = data;
    // Insert the product into the database
    const [productTable] = await pool.query(
        `INSERT INTO products (category,
        title,
        description,
        price,
        texture,
        wash,
        place,
        note,
        story) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? )`,
        [category, title, description, price, texture, wash, place, note, story],
    );
    const id = productTable.insertId;

    // Insert the variants into the database
    const variants = Array.isArray(color_code)
        ? color_code.map((code, i) => [id, color_name[i], code, size[i], stock[i]])
        : [[id, color_name, color_code, size, stock]];
    await createVariants(variants);

    // Insert the images into the database
    const mainImage = [[id, main_image.image_name, main_image.image_path, 'main']];
    await createImages(mainImage);
    if (imageArray) {
        const otherImages = imageArray.map((image) => [
            id,
            image.image_name,
            image.image_path,
            'other',
        ]);
        await createImages(otherImages);
    }
    return productTable;
};

export const getCampaign = async (limit, page) => {
    const offset = limit * page;
    const allCampaign = await pool.query('SELECT COUNT(*) FROM campaigns');
    if (allCampaign.length === 0) {
        throw new NotFoundError('Campaign empty', 500);
    }

    const [campaigns] = await pool.query('SELECT * FROM campaigns  LIMIT ? OFFSET ?', [
        limit,
        page,
    ]);
    const banners = await Promise.all(
        campaigns.map(async (campaign) => {
            const { product_id } = campaign;
            const picture = await getImageById(product_id, 'campaign');
            return { ...campaign, picture };
        }),
    );
    const nextPage = page + 1;
    if (limit < allCampaign - offset) {
        return { data: banners, next_paging: nextPage };
    }
    return { data: banners };
};

export const createCampaign = async (data, picture) => {
    const { product, title, story } = data;
    await pool.query('INSERT INTO campaigns (product_id,title, story) VALUES (?, ?, ? )', [
        parseInt(product, 10),
        title,
        story,
    ]);

    const image = [[product, picture.image_name, picture.image_path, 'campaign']];
    await createImages(image);
    const result = {
        id: product,
        title,
        story,
        picture: picture.image_path,
    };
    return result;
};

export const getUserByEmail = async (email) => {
    const [user] = await pool.query('SELECT * FROM users WHERE email = ?;', [email]);
    return user;
};

export const createUser = async (data) => {
    const { name, email, password, provider, provider_id, picture } = data;
    const checkEmail = await getUserByEmail(email);
    if (checkEmail.length === 1) {
        throw new NotFoundError('Email already exists', 500);
    }
    const [user] = await pool.query(
        'INSERT INTO users ( name, email, password, provider, provider_id, picture) VALUES (?,?, ?, ?, ? ,?)',
        [name, email, password, provider, provider_id, picture],
    );
    return user;
};

export const getDataById = async (id) => {
    let [product] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    product = await mergerData(product[0]);
    return { data: product };
};

export const search = async (keyword, limit, page) => {
    const offset = limit * page;
    const all = await pool.query('SELECT COUNT(*) FROM products WHERE title LIKE ?', [
        `%${keyword}%`,
    ]);
    const [productsResult] = await pool.query(
        'SELECT * FROM products WHERE title LIKE ? LIMIT ? OFFSET ?',
        [`%${keyword}%`, limit, offset],
    );
    const products = await Promise.all(productsResult.map((product) => mergerData(product)));

    const nextPage = page + 1;
    if (limit < all - offset) {
        return { data: products, next_paging: nextPage };
    }
    return { data: products };
};

export const getDataByCategory = async (category, limit, page) => {
    let allProducts;
    let productsResult;
    const offset = limit * page;

    if (category === 'all') {
        allProducts = await pool.query('SELECT COUNT(*) FROM products');
        [productsResult] = await pool.query(
            'SELECT * FROM products ORDER BY id DESC LIMIT ? OFFSET ?',
            [limit, offset],
        );
    } else {
        allProducts = await pool.query('SELECT COUNT(*) FROM products WHERE category = ?', [
            category,
        ]);
        [productsResult] = await pool.query(
            'SELECT * FROM products WHERE category = ? ORDER BY id DESC LIMIT ? OFFSET ?',
            [category, limit, offset],
        );
    }

    const products = await Promise.all(productsResult.map((product) => mergerData(product)));

    const nextPage = page + 1;
    if (limit < allProducts - offset) {
        return { data: products, next_paging: nextPage };
    }
    return { data: products };
};

export const getUserByAdmin = async () => {
    const [user] = await pool.query("SELECT * FROM users WHERE role = 'admin'");
    console.log(user);
    return { data: user };
};

// 生成随机整数
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成随机订单数据
function generateRandomOrder() {
    const total = getRandomInt(100, 1000);
    const userId = getRandomInt(1, 5);
    const status = '已付款';
    const recipient = JSON.stringify({
        name: 'John Doe',
        address: '123 Main St',
        city: 'New York',
        country: 'USA',
    });
    return [userId, total, recipient, status];
}

function create(numRecords) {
    const records = [];
    for (let i = 0; i < numRecords; i++) {
        records.push(generateRandomOrder());
    }
    return records;
}

const createOrders = async (records) => {
    const [order] = await pool.query(
        'INSERT INTO orders (user_id, total,recipient,status) VALUES ?',
        [records],
    );
    return order;
};

export const getOrders = async () => {
    const [order] = await pool.query('SELECT * FROM orders ');
    return order;
};

export const getTotalRevenue = async () => {
    const [result] = await pool.query(`select SUM(total) AS total from orders`);
    return result;
};
getTotalRevenue();
export const getOrdersColor = async () => {
    const [order] = await pool.query(`
    SELECT color_code FROM order_details 
    `);
    return order;
};
export const getOrdersPrice = async () => {
    const [result] = await pool.query(`
    SELECT price,quantity FROM order_details 
    `);
    return result;
};
export const getOrdersSize = async () => {
    const [result] = await pool.query(`
    SELECT product_id,size,quantity FROM order_details 
    `);
    return result;
};
