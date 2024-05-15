import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define your controller methods here
export const getAllPublications = (_req: Request, res: Response) => {
    // Logic to fetch all publications from the database
    // Return the publications as a response
    prisma.publication.findMany().then((publications) => {
        res.json(publications);
    }).catch((error) => {
        res.json({ error: error.message });
    });
}

export const getPublicationById = (req: Request, res: Response) => {
    // Logic to fetch a publication by its ID from the database
    // Return the publication as a response
    const id = parseInt(req.params.id);
    prisma.publication.findUnique({
        where: {
            id: id
        }
    }).then((publication) => {
        if (publication) {
            res.json(publication);
        } else {
            res.json({ error: "Publication not found" });
        }
    }).catch((error) => {
        res.json({ error: error.message });
    });
};

export const createPublication = (req: Request, res: Response) => {
    // Logic to create a publication in the database
    // Return the created publication as a response
    const { title, price, author, description, ownerId, image} = req.body;
    prisma.publication.create({
        data: {
            title: title,
            price: price,
            author: author,
            description: description,
            ownerId: ownerId,
            image: image
        }
    }).then((publication) => {
        res.json(publication);
    }
    ).catch((error) => {
        res.json({ error: error.message });
    });
};

export const autocompleteData = (req: Request, res: Response) => {
    return res.json({ 
        author: "J.K. Rowling",
        description: "Harry is a little boy wizard bla bla bla"
     });
}

export const updatePublication = (req: Request, res: Response) => {
    // Logic to update a publication in the database
    // Return the updated publication as a response
};

export const deletePublication = (req: Request, res: Response) => {
    // Logic to delete a publication from the database
    // Return a success message as a response
};