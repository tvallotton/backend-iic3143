import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

export const JWT_SECRET = process.env["JWT_SECRET"] || Math.random() + "";
const prisma = new PrismaClient();

const booksStates = {
  Nuevo: "NEW",
  "Como Nuevo": "LIKE_NEW",
  Usado: "USED",
  "Muy Usado": "VERY_USED",
} as const;

const publicationTypes = {
  Venta: "SELL",
  Permuta: "TRADE",
  "Venta/Permuta": "SELL_TRADE",
} as const;

export const getAllPublications = (_req: Request, res: Response) => {
  prisma.publication
    .findMany({
      include: {
        owner: {
          select: {
            name: true, // Only select the name field
          },
        },
      },
    })
    .then((publications) => {
      const enumsMappedPublications = publications.map((publication) => {
        return {
          ...publication,
          type: Object.keys(publicationTypes).find((key) => publication.type === publicationTypes[key as keyof typeof publicationTypes]),
          bookState: Object.keys(booksStates).find((key) => publication.bookState === booksStates[key as keyof typeof booksStates]),
        };
      });
      res.json(enumsMappedPublications);
    })
    .catch((error) => {
      res.json({ error: error.message });
    });
};

export const getPublicationById = (req: Request, res: Response) => {
  const { id } = req.params;
  prisma.publication
    .findUnique({
      where: {
        id,
      },
      include: {
        owner: true,
      },
    })
    .then((publication) => {
      if (publication) {
        const response = {
          ...publication,
          owner: publication.owner.name,
          type: Object.keys(publicationTypes).find((key) => publication.type === publicationTypes[key as keyof typeof publicationTypes]),
          bookState: Object.keys(booksStates).find((key) => publication.bookState === booksStates[key as keyof typeof booksStates]),
        };
        res.json(response);
      } else {
        res.json({ error: "Publication not found" });
      }
    })
    .catch((error) => {
      res.json({ error: error.message });
    });
};

export const createPublication = (req: Request, res: Response) => {
  const id = req.user?.id;

  if (!id) {
    return res.status(500).json({ error: "Internal server error" });
  }

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
    bookId,
  } = req.body;

  prisma.publication
    .create({
      data: {
        title: title as string,
        author: author as string,
        language: language as string,
        genres: genres as string[],
        bookState: booksStates[bookState as keyof typeof booksStates],
        description: description as string,
        type: publicationTypes[type as keyof typeof publicationTypes],
        price: price ? Number(price) : 0,
        image: image as string,
        bookId: bookId as string,
        ownerId: id as string,
      },
    })
    .then((publication) => {
      res.json(publication);
    })
    .catch((error) => {
      res.json({ error: error.message });
    });
};

export const updatePublication = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { description, state, type, language, price } = req.body;
  const updateData = {
    description,
    state,
    type,
    language,
    price,
  };

  const userId = req.user?.id;

  if (!userId) {
    return res.status(500).json({ error: "Internal server error" });
  }

  try {
    const publication = await prisma.publication.findUnique({
      where: { id },
    });

    if (!publication) {
      return res.status(404).json({ error: "Publication doesn't exist" });
    }

    if (publication.ownerId !== userId) {
      return res.status(403).json({
        error: "You don't have permission to update this publication",
      });
    }

    const updatedPublication = await prisma.publication.update({
      where: { id },
      data: {
        ...updateData,
        type: publicationTypes[updateData.type as keyof typeof publicationTypes],
        bookState: booksStates[updateData.state as keyof typeof booksStates],
      },
    });

    res.json(updatedPublication);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePublication = async (req: Request, res: Response) => {
  const { id } = req.params;

  const userId = req.user?.id;

  if (!userId) {
    return res.status(500).json({ error: "Internal server error" });
  }

  try {
    const publication = await prisma.publication.findUnique({
      where: { id },
    });

    if (!publication || publication.ownerId !== userId) {
      return res.status(403).json({
        error: "You don't have permission to delete this publication",
      });
    }

    await prisma.publication.delete({
      where: { id },
    });

    res.json({ message: "Publication deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// FILTERS

export const getGenres = async (_req: Request, res: Response) => {
  try {
    const genres = await prisma.publication.findMany({
      distinct: ["genres"],
      select: {
        genres: true,
      },
    });

    const genresList = genres.map((genre) => genre.genres).flat();
    const uniqueGenres = [...new Set(genresList)];

    res.json(uniqueGenres);
  } catch (error: any) {
    res.json({ error: error.message });
  }
};
