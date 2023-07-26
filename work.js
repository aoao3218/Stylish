import {client } from "./model/redis.js";
import { getOrders } from "./model/data.js";


const targetOrigin = 'http://localhost:3001/v2/report/payments/result';

async function execute () {
    const firstOfList = await client.BLPOP("orders",1);
    console.log("hi")
    if(!firstOfList) return ;  
    const data = await getOrders();
    const totalOrders = [];

    data.forEach(order => {
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

      try {
        await client.RPUSH("total",JSON.stringify(totalOrders))
        console.log('Message sent successfully');
      } catch (error) {
        console.error('Failed to send message:');
      }
}

while(true){
   await execute()
}
