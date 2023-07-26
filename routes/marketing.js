import express from "express";
import { getCampaign } from "../model/data.js";
import {client,cacheCampaigns} from "../model/redis.js";

const marketing = express.Router();


marketing.get("/campaign", cacheCampaigns ,async (req, res, next) => {
  try {
    const limit = 6;
    let { paging } = req.query;
    if (paging === undefined) {
      paging = 0;
    } else {
      paging = parseInt(paging, 10);
      if (Number.isNaN(Number(paging)) || paging < 0) {
        throw {status:400,message:"Invalid query parameter"};
      }
    }
    
    const Campaign = await getCampaign(limit, paging);

    if(client.isReady){
      //set redis
      client.set("campaign",JSON.stringify(Campaign));
    }
    res.json(Campaign);
  } catch (err) {
    next(err);
  }
});

export default marketing;
