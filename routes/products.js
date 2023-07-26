import express from "express";
import { getDataByCategory, search, getDataById } from "../model/data.js";
import NotFoundError from "../model/error.js";

const router = express.Router();

router.get("/search", async (req, res, next) => {
  try {
    const { keyword } = req.query;
    const limit = 6;
    let { paging } = req.query;
    if (paging !== undefined) {
      paging = parseInt(paging, 10);
      if (Number.isNaN(Number(paging))) {
        throw new NotFoundError("Invalid query parameter", 400);
      }
    } else {
      paging = 0;
    }

    const ProductList = await search(keyword, limit, paging);
    res.status(200).json(ProductList);
  } catch (err) {
    next(err);
  }
});

router.get("/details", async (req, res, next) => {
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
      res.json(product);
    }
  } catch (err) {
    next(err);
  }
});

router.get("/:category", async (req, res, next) => {
  try {
    const { category } = req.params;
    if (
      category !== "all" &&
      category !== "women" &&
      category !== "men" &&
      category !== "accessories"
    ) {
      throw new NotFoundError("Invalid params parameter", 400);
    }
    const limit = 6;
    let { paging } = req.query;
    if (paging === undefined) {
      paging = 0;
    } else {
      paging = parseInt(paging, 10);
      if (Number.isNaN(Number(paging)) || paging < 0) {
        throw new NotFoundError("Invalid params parameter", 400);
      }
    }

    const ProductList = await getDataByCategory(category, limit, paging);
    if (ProductList.data.length === 0) {
      throw new NotFoundError("Product empty", 400);
    }

    res.status(200).json(ProductList);
  } catch (err) {
    next(err);
  }
});

export default router;
