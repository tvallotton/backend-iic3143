import express from "express";
import {
  getAllPublications,
  getPublicationById,
  createPublication,
  updatePublication,
  deletePublication,
  getGenres,
  createInteraction,
  getInteractions,
  completeInteraction,
} from "./controller.js";
import { user } from "../user/middleware.js";
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

// INTERACTIONS
router.post("/:id/interactions", user(), createInteraction);

router.get("/:id/interactions", user(), getInteractions);

router.patch("/interactions/:id", user(), completeInteraction);

export default router;
