import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import mailer, { MAIL_USER } from "../mailer.js";

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

const publicationStates = {
  Activa: "AVAILABLE",
  Cerrada: "UNAVAILABLE",
} as const;

export const getAllPublications = (req: Request, res: Response) => {
  prisma.publication
    .findMany({
      where: req.user?.isAdmin ? {} : { status: publicationStates.Activa },
      include: {
        owner: {
          select: {
            name: true,
          },
        },
      },
    })
    .then((publications) => {
      const enumsMappedPublications = publications.map((publication) => {
        return {
          ...publication,
          type: Object.keys(publicationTypes).find(
            (key) =>
              publication.type ===
              publicationTypes[key as keyof typeof publicationTypes]
          ),
          bookState: Object.keys(booksStates).find(
            (key) =>
              publication.bookState ===
              booksStates[key as keyof typeof booksStates]
          ),
        };
      });
      res.json(enumsMappedPublications);
    })
    .catch((error) => {
      res.json({ error: error.message });
    });
};


export const getPublicationRecommendation = async (req: Request, res: Response) => {
  if (!req.user) return;

  const genres: { [key: string]: number; } = {};

  for (const interaction of req.user.PublicationInteraction) {
    for (const genre of interaction.publication?.genres || []) {
      genres[genre] = (genres[genre] || 0) + 1;
    }
  }

  const topGenres = Object.entries(genres).sort((x, y) => y[1] - x[1]).map(([x, _]) => x).slice(0, 2);
  try {
    res.json(await prisma.publication.findMany({
      where: {
        genres: {
          hasSome: topGenres
        }
      },
      take: 5
    }));
  } catch (error) {
    res.json({ error: (error as Error).message });
  }
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
          type: Object.keys(publicationTypes).find(
            (key) =>
              publication.type ===
              publicationTypes[key as keyof typeof publicationTypes]
          ),
          bookState: Object.keys(booksStates).find(
            (key) =>
              publication.bookState ===
              booksStates[key as keyof typeof booksStates]
          ),
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
      res.status(201).json(publication);
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
};

export const updatePublication = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { description, state, status, type, language, price } = req.body;
  const updateData = {
    description,
    state,
    status,
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
        type: publicationTypes[
          updateData.type as keyof typeof publicationTypes
        ],
        bookState: booksStates[updateData.state as keyof typeof booksStates],
        status: publicationStates[updateData.status as keyof typeof publicationStates],
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
    if (!publication) {
      return res.status(404).json({
        error: "The publication was not found."
      });
    }

    if (publication.ownerId !== userId && !req.user?.isAdmin) {
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

// Interaction
export const createInteraction = async (req: Request, res: Response) => {
  const { id: publicationId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(500).json({ error: "Internal server error" });
  }

  try {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
      include: {
        owner: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!publication) {
      return res.status(404).json({ error: "Publication doesn't exist" });
    }

    if (publication.ownerId === userId) {
      return res.status(403).json({
        error: "You can't interact with your own publication",
      });
    }

    let interaction = await prisma.publicationInteraction.upsert({
      where: {
        publicationId_userId: {
          publicationId,
          userId,
        },
      },
      update: {},
      create: {
        publicationId,
        userId,
      },
    });

    const currentDate = new Date();
    const lastUpdate = new Date(interaction.updatedAt);
    const diff = currentDate.getTime() - lastUpdate.getTime();

    // If the last email was sent more than 2 days ago, reset the emailSent flag
    if (diff > 1000 * 60 * 60 * 24 * 2) {
      interaction = await prisma.publicationInteraction.update({
        where: {
          id: interaction.id,
        },
        data: {
          emailSent: false,
        },
      });
    }

    if (!interaction.emailSent) {
      res.on("finish", async () => {
        await mailer.sendMail({
          from: MAIL_USER,
          to: publication.owner.email,
          subject: "Usuario interesado en tu publicación",
          text: `
      !Hola ${publication.owner.name}!

      El usuario

        Nombre: ${req.user?.name}
        Correo: ${req.user?.email}

      ha mostrado interés en tu publicación ${publication.title}.

      Puedes ponerte en contacto con el usuario respondiendo a este correo.

      Saludos,

      El equipo de PagePals`,
          replyTo: req.user?.email,
        });

        await prisma.publicationInteraction.update({
          where: {
            id: interaction.id,
          },
          data: {
            updatedAt: new Date(),
            emailSent: true,
          },
        });
      });
      return res.status(201).json({ interaction });
    }

    res.status(200).json({ interaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInteractions = async (req: Request, res: Response) => {
  const { id: publicationId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(500).json({ error: "Internal server error" });
  }

  try {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
    });

    if (!publication) {
      return res.status(404).json({ error: "Publication doesn't exist" });
    }

    if (publication.ownerId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({
        error: "You don't have permission to see this publication interactions",
      });
    }

    const interactions = await prisma.publicationInteraction.findMany({
      where: {
        publicationId,
      },
      include: {
        user: {
          select: {
            name: true,
            lastName: true,
            email: true,
            id: true,
          },
        },
      },
    });

    res.json(interactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const completeInteraction = async (req: Request, res: Response) => {
  const { id: interactionId } = req.params;

  const userId = req.user?.id;
  if (!userId) {
    return res.status(500).json({ error: "Internal server error" });
  }

  try {
    const interaction = await prisma.publicationInteraction.findUnique({
      where: { id: interactionId },
      include: {
        publication: true,
      },
    });
    if (!interaction || !interaction.publication) {
      return res.status(404).json({ error: "Interaction or publication doesn't exist" });
    }

    if (interaction.publication.ownerId !== userId) {
      return res.status(403).json({
        error: "You don't have permission to complete this interaction",
      });
    }

    await prisma.publicationInteraction.update({
      where: { id: interactionId },
      data: {
        status: "COMPLETED",
      },
    });
    res.json({ message: "Interaction completed successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
