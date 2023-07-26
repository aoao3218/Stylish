import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { getUserByEmail, createUser } from "../model/data.js";

dotenv.config();
const router = express.Router();
const secret = process.env.SECRET;
const timing = 30 * 24 * 60 * 60;
const signData = (user) => ({
  id: user.id,
  provider: user.provider,
  name: user.name,
  email: user.email,
  picture: user.picture
});
const outPutData = (token, user) => ({
  data: {
    access_token: `${token}`,
    access_expired: timing,
    user: {
      id: user.id,
      provider: user.provider,
      name: user.name,
      email: user.email,
      picture: user.picture
    }
  }
});

router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const provider = req.body.provider || "native";
    const picture = req.body.picture || null;
    const hashedPassword = await bcrypt.hash(password, 10);
    const data = { name, email, hashedPassword, provider, picture };
    const user = await createUser(data);
    data.id = user.insertId;

    const sign = signData(data);
    const token = jwt.sign(sign, secret, { expiresIn: timing });
    const result = outPutData(token, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/signin", async (req, res) => {
  const { email, password, provider, access_token } = req.body;
  if (provider === "facebook") {
    const FBData = await fetch(
      `https://graph.facebook.com/v16.0/me?fields=id%2Cname%2Cemail%2Cpicture&access_token=${access_token}`
    )
      .then((response) => response.json())
      .then((data) => data);
    const [user] = await getUserByEmail(FBData.email);
    const data = {
      provider_id: FBData.id,
      name: FBData.name,
      email: FBData.email,
      provider,
      picture: FBData.picture.data.url
    };
    if (!user) {
      const account = await createUser(data);
      data.id = account.insertId;
    }
    const sign = signData(data);
    const token = jwt.sign(sign, secret, { expiresIn: timing });
    const result = outPutData(token, data);
    res.json(result);
  } else {
    const [user] = await getUserByEmail(email);
    if (!user) {
      throw {status:400,message:"Account Error"};
    }
    if (await bcrypt.compare(password, user.password)) {
      const sign = signData(user);
      const token = jwt.sign(sign, secret, { expiresIn: timing });
      const result = outPutData(token, user);
      res.json(result);
    } else {
      throw {status:400,message:"Password Error"};
    }
  }
});

router.get("/profile", async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    // Authorization header 的格式是 'Bearer <token>'
    if (!token) {
      throw {status:401,message:"token doesn't exist"};
    }
    const user = jwt.verify(token, secret);
    const result = {
      data: {
        provider: user.provider,
        name: user.name,
        email: user.email,
        picture: user.picture
      }
    };
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
