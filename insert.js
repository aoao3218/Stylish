import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

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

// 生成随机整数
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成随机订单数据
function generateRandomOrder(totalPrice) {
    const total = totalPrice;
    const userId = 1;
    const status = '已付款';
    const recipient = JSON.stringify({
        name: 'John Doe',
        address: '123 Main St',
        city: 'New York',
        country: 'USA',
    });
    return { userId, total, recipient, status };
}

const createOrders = async () => {
    const data = await fetch('http://35.75.145.100:1234/api/1.0/order/data')
        .then((res) => res.json())
        .then((data) => data);

    const totalArray = data.map((item) => item.total);
    const listArray = data.map((item) => item.list);
    console.log(data.length);

    data.forEach(async (item) => {
        const total = item.total;
        const orderData = generateRandomOrder(total);

        const [order] = await pool.query(
            'INSERT INTO orders (user_id, total,recipient,status) VALUES (?,?,?,?)',
            [orderData.userId, orderData.total, orderData.recipient, orderData.status],
        );
        const number = order.insertId;
        // create order_details
        const details = data[i].list;
        const detailsArray = details.reduce((acc, item) => {
            const arr = [number, item.id, item.color.code, item.size, item.qty, item.price];
            acc.push(arr);
            return acc;
        }, []);
        await pool.query(
            'INSERT INTO order_details (order_id,product_id, color_code,size,quantity,price) VALUES ?',
            [detailsArray],
        );
    });

    // for (let i = 0; i < data.length; i++) {
    //     const total = data[i].total;
    //     const orderData = generateRandomOrder(total);

    //     const [order] = await pool.query(
    //         'INSERT INTO orders (user_id, total,recipient,status) VALUES (?,?,?,?)',
    //         [orderData.userId, orderData.total, orderData.recipient, orderData.status],
    //     );
    //     const number = order.insertId;
    //     // create order_details
    //     const details = data[i].list;
    //     const detailsArray = details.reduce((acc, item) => {
    //         const arr = [number, item.id, item.color.code, item.size, item.qty, item.price];
    //         acc.push(arr);
    //         return acc;
    //     }, []);
    //     await pool.query(
    //         'INSERT INTO order_details (order_id,product_id, color_code,size,quantity,price) VALUES ?',
    //         [detailsArray],
    //     );
    // }
    console.log('done');
    return;
};

createOrders();
