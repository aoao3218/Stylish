import express from "express";
import { getOrders } from "../model/data.js";
import { client } from "../model/redis.js";

const APIRouter = express.Router();

APIRouter.get("/v1/report/payments", async(req, res) => {
    const orders = await getOrders();
    const totalOrders = [];

    orders.forEach(order => {
        const { user_id, total } = order;
        const existingUser = totalOrders.find(item => item.user_id === user_id);
        if (existingUser) {
          existingUser.total_payment += parseInt(total);
        } else {
            totalOrders.push({
            user_id,
            total_payment: parseInt(total)
          });
        }
      });
    console.log(totalOrders)
    res.status(200).json({data: totalOrders});
  });
  

APIRouter.get("/v2/report/payments",async(req, res) => {
  if(!client.isReady){
    return res.status(500).send("Redis not connect");
  }
  const ip =req.ip
  await client.RPUSH("orders",ip)
  res.redirect("/api/v2/report/payments/result")
  })

let totalOrdersData = null;

APIRouter.get("/v2/report/payments/result", async (req,res) => {
  const totalOrders = await client.BLPOP("total",0); // 从全局变量中获取数据
  res.send(totalOrders.element);
})


export default APIRouter;