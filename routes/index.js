import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {
  getDataByCategory,
  getCampaign,
  getDataById,
  createUser,
  getUserByEmail,
  createOrderList,
  search
} from "../model/data.js";
import NotFoundError from "../model/error.js";

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

// router.get("/", async(req, res) => {
//   res.send("Hello World!");
// });

router.get("/", async (req, res, next) => {
  const limit = 6;
  const paging = 0;
  const category = req.query.category || "all";
  const keyword = req.query.keyword || null;
  try {
    const Campaign = await getCampaign(limit, paging);
    if(keyword){
      const ProductList = await search(keyword, limit, paging);
      return res.status(200).render("index", { ProductList, Campaign });
    }
    
    const ProductList = await getDataByCategory(category, limit, paging);
    res.status(200).render("index", { ProductList, Campaign });
  } catch (err) {
    console.log(err)
    next(err);
  }
});

router.get("/product.html", async (req, res, next) => {
  try {
    const { id } = req.query;
    if (Number.isNaN(Number(id)) || !id) {
      throw new NotFoundError("Invalid ID", 400);
    } else {
      const productId = parseInt(id, 10);
      const product = await getDataById(productId);
      if (product.data.length === 0) {
        throw new NotFoundError("Product not found", 400);
      }
      const detail = product.data;
      res.render("product", { product: detail });
    }
  } catch (err) {
    next(err);
  }
});

router.get("/user.html", async (req, res) => {
  let msg
  res.render("user",{msg});
});

router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const provider = req.body.provider || "native";
    const picture = req.body.picture || null;
    const hashedPassword = await bcrypt.hash(password, 10);
    const data = { name, email, password: hashedPassword, provider, picture };
    const user = await createUser(data);
    res.render("user",{msg:"註冊完成"});
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res) => {
  const { email, password, provider, access_token } = req.body;
  const returnUrl = req.cookies.returnUrl || "/profile.html";
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
    res.cookie("access_token", token);
    res.clearCookie("returnUrl");
    res.redirect(returnUrl);
  } else {
    const [user] = await getUserByEmail(email);
    if (!user) {
      return res.render("user",{ msg:"Account Error" });
    }
    if (await bcrypt.compare(password, user.password)) {
      const sign = signData(user);
      const token = jwt.sign(sign, secret, { expiresIn: timing });
      res.cookie("access_token", token);
      res.clearCookie("returnUrl");
      res.redirect(returnUrl);
    } else {
      return res.render("user",{msg:"Password Error"});
    }
  }
});

router.get("/profile.html", async (req, res, next) => {
  try {
    const token = req.cookies.access_token;

    if (!token) {
      res.redirect("/user.html");
    }
    const user = jwt.verify(token, secret);

    res.render("profile", { user });
  } catch (err) {
    next(err);
  }
});

router.get("/checkout.html", async (req, res) => {
  res.render("checkout");
});

router.post("/order/checkout", async (req, res) => {
  try {
    const token = req.cookies.access_token;
    if (!token) {
      throw new NotFoundError("Unauthorized", 400);
    }
    const user = jwt.verify(token, secret);
    const data = req.body;
    const { total } = req.body.order;
    const { list } = req.body.order;
    const order = await createOrderList(user, list, data, total);
    const result ={ number: order };
    res.status(200).send({ data: result ,status:200});
  } catch (err) {
    res.status(err.status).send({ message: err.message,status:400 });
  }
});

router.get("/thankyou.html", async (req, res) => {
  const {order} = req.cookies
  res.render("thankyou",{order});
});

router.post("/logout", async (req, res) => {
  res.clearCookie("access_token");
  res.redirect("/user.html");
});

router.get("/healthycheck", async(req, res) => {
  res.status(200).send("ok");
});

export default router;
