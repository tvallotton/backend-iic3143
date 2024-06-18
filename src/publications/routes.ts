import express from "express";
import {
  getAllPublications,
  getPublicationById,
  createPublication,
  updatePublication,
  deletePublication,
  getGenres,
} from "./controller";
import { user } from "../user/middleware";
const router = express.Router();

// FILTERS
router.get("/genres", getGenres);

// PUBLICATIONS

// GET /publications - Get all publications
router.get("/", getAllPublications);

// GET /publications/:id - Get a publication by its ID
router.get("/:id", getPublicationById);

// POST /publications - Create a new publication
router.post("/", user(), createPublication);

// PUT /publications/:id - Update a publication
router.put("/:id", user(), updatePublication);

// DELETE /publications/:id - Delete a publication
router.delete("/:id", user(), deletePublication);

export default router;
