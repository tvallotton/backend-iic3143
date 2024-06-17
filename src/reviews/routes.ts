import express from "express";
import {
  getAllReviews,
  getReviewById,
  createReview,
  getReviewsReceived,
  getReviewsGiven,
  getUserRating,
} from "./controller.js";
import { user } from "../user/middleware";

const router = express.Router();

// GET /reviews - Get all reviews
router.get("/", getAllReviews);

// GET /reviews/:id - Get a review by its ID
router.get("/:id", getReviewById);

// POST /reviews - Create a new review
router.post("/", user(), createReview);

// GET /reviews/received/:id - Get all reviews received by a user
router.get("/received/:id", getReviewsReceived);

// GET /reviews/given/:id - Get all reviews given by a user
router.get("/given/:id", getReviewsGiven);

// GET /reviews/rating/:id - Get the rating of a user
router.get("/rating/:id", getUserRating);

export default router;
