import express from 'express';
import { getTotalRevenue, getOrdersColor, getOrdersPrice, getOrdersSize } from '../model/data.js';
import router from './index.js';

router.get('/total', async (req, res) => {
    const [total] = await getTotalRevenue();
    // const result = total.reduce((acc, item) => {
    //     const total = parseInt(item.total);
    //     return (acc += total);
    // }, 0);
    res.json(total);
});

router.get('/colors', async (req, res) => {
    const colors = await getOrdersColor();
    const result = colors.reduce((acc, item) => {
        const colorCode = item.color_code;
        const existingColor = acc.find((item) => Object.keys(item)[0] == colorCode);

        if (existingColor) {
            existingColor[colorCode]++;
        } else {
            const newColor = { [colorCode]: 1 };
            acc.push(newColor);
        }
        return acc;
    }, []);
    res.json({ data: result });
});

router.get('/price', async (req, res) => {
    const price = await getOrdersPrice();
    console.log(price);
    // const result = price.reduce((acc, item) => {
    //     const price = item.price;
    //     const existingPrice = acc.find((obj) => Object.keys(obj)[0] === String(price));

    //     if (existingPrice) {
    //         existingPrice[price] += item.quantity;
    //     } else {
    //         const newPrice = { [price]: item.quantity };
    //         acc.push(newPrice);
    //     }
    //     return acc;
    // }, []);

    res.json({ data: price });
});

router.get('/top5', async (req, res) => {
    const allDetails = await getOrdersSize();
    console.log(allDetails);
    const result = allDetails.reduce((acc, item) => {
        const id = item.product_id;
        const size = item.size;
        const existingProduct = acc.find((obj) => Object.keys(obj)[0] === String(id));

        if (existingProduct) {
            existingProduct[id] += item.quantity;

            if (existingProduct.hasOwnProperty(size)) {
                existingProduct[size] += item.quantity;
            } else {
                existingProduct[size] = item.quantity;
            }
        } else {
            const newProduct = { [id]: item.quantity, [size]: item.quantity };
            acc.push(newProduct);
        }

        return acc;
    }, []);
    console.log(result);
    let largest = (arr, n) =>
        arr
            .sort((a, b) => {
                const A = Object.values(a)[0];
                const B = Object.values(b)[0];
                return B - A;
            })
            .slice(0, n);

    const top5 = largest(result, 5);
    const top1 = res.json({ data: top5 });
});

export default router;
