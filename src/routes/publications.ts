import express from 'express';
import { getAllPublications, getPublicationById, createPublication, updatePublication, deletePublication } from '../controllers/publications';

const router = express.Router();

// GET /publications - Get all publications
router.get('/', getAllPublications);

// GET /publications/:id - Get a publication by its ID
router.get('/:id', getPublicationById);

// POST /publications - Create a new publication
router.post('/', createPublication);

// PUT /publications/:id - Update a publication
router.put('/:id', updatePublication);

// DELETE /publications/:id - Delete a publication
router.delete('/:id', deletePublication);

export default router;