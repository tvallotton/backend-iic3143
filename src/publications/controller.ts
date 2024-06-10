import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env["JWT_SECRET"] || Math.random() + "";
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
    var token = req.headers.authorization
    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }
    token = token.replace("Bearer ", "");
    const { id } = jwt.verify(token, JWT_SECRET, {}) as { id: number; };

    const {
        title,
        author,
        language,
        genres,
        bookState,
        description,
        type,
        price,
        image,
        bookId
    } = req.body;

    prisma.publication.create({
        data: {
            title: title,
            author: author,
            language: language,
            genres: genres,
            bookState: bookState,
            description: description,
            type: type,
            price: price === "" ? 0 : price,
            image: image,
            bookId: bookId,
            ownerId: id
        }
    }).then((publication) => {
        res.json(publication);
    }
    ).catch((error) => {
        res.json({ error: error.message });
    });
};

export const updatePublication = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {description, state, type, language, price } = req.body;
    const updateData = {
        description,
        state,
        type,
        language,
        price,
    };

    var token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }
    token = token.replace("Bearer ", "");
    const { id: userId } = jwt.verify(token, JWT_SECRET, {}) as { id: number; };

    try {
        const publication = await prisma.publication.findUnique({
            where: { id: Number(id) },
        });

        if (!publication) {
            return res.status(404).json({ error: "Publication doesn't exist" });
        }

        if (publication.ownerId !== userId) {
            return res.status(403).json({ error: "You don't have permission to update this publication" });
        }

        const updatedPublication = await prisma.publication.update({
            where: { id: Number(id) },
            data: updateData,
        });

        res.json(updatedPublication);
    } catch (error: any) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
};

export const deletePublication = async (req: Request, res: Response) => {
    const { id } = req.params;

    var token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }
    token = token.replace("Bearer ", "");
    const { id: userId } = jwt.verify(token, JWT_SECRET, {}) as { id: number; };

    try {
        const publication = await prisma.publication.findUnique({
            where: { id: Number(id) },
        });

        if (!publication || publication.ownerId !== userId) {
            return res.status(403).json({ error: "You don't have permission to delete this publication" });
        }

        await prisma.publication.delete({
            where: { id: Number(id) },
        });

        res.json({ message: "Publication deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
