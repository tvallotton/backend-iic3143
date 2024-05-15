import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllPublications = (_req: Request, res: Response) => {
    prisma.publication.findMany({
        include: {
            owner: {
                select: {
                    name: true, // Only select the name field
                },
            },
        },
    })
    .then((publications) => {
        res.json(publications);
    })
    .catch((error) => {
        res.json({ error: error.message });
    });
}

export const getPublicationById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    prisma.publication.findUnique({
        where: {
            id: id
        },
        include: {
            owner: true
        }
    }).then((publication) => {
        if (publication) {
            const response = {
                ...publication,
                owner: publication.owner.name
            };
            res.json(response);
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