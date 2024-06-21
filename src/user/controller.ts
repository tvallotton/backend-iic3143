import { PrismaClient, User } from "@prisma/client";
import argon2 from "argon2";
import { Router } from "express";
import jwt from "jsonwebtoken";
import errors from "../errors.js";
import mailer, { MAIL_USER } from "../mailer.js";
import { JWT_SECRET, user } from "./middleware.js";

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();
const router = Router();
const HOST = process.env["HOST"] || "http://localhost:5173";

router.get("/", user({ adminsOnly: true }), async (req, res) => {
    const skip = Number(req.query.skip) || undefined;
    const take = Number(req.query.take) || undefined;

    const users = await prisma.user.findMany({
        skip,
        take,
        orderBy: {
            createdAt: "desc",
        },
    });
    res.json({ users });
});

router.get("/interactions", user(), async (req, res) => {
    const userId = req.user?.id;
    console.log(req.user);
    if (!userId) {
        return res.status(500).json({ error: "Internal server error" });
    }

    const interactions = await prisma.publicationInteraction.findMany({
        where: {
            userId,
            publicationId: {
                not: null,
            },
        },
        include: {
            publication: true,
        },
    });

    const publicationIds = interactions.reduce<string[]>((acc, i) => {
        if (i.publicationId !== null) {
            acc.push(i.publicationId);
        }
        return acc;
    }, []);

    const othersInteractions = await prisma.publicationInteraction.findMany({
        where: {
            publicationId: {
                in: publicationIds,
            },
            userId: {
                not: userId,
            },
            status: "COMPLETED",
        },
    });

    const completedPublications = othersInteractions.map(
        (oi) => oi.publicationId
    );

    const filteredInteractions = interactions.filter(
        (i) =>
            // Se filtran interacciones de publicaciones completadas por otros usuarios
            !completedPublications.includes(i.publicationId)
    );

    res.json(filteredInteractions);
});

router.get("/me", user(), async (req: any, res: any) => {
    const user = req.user;
    delete (user as any)?.password;
    res.status(200).json({ user });
});

router.get("/:id", user(), async (req, res) => {
    const { id } = req.params;
    const isAdmin = req.user?.isAdmin;

    const user = await prisma.user.findFirst({
        where: { id },
        select: isAdmin ? undefined : {
            id: true,
            name: true,
        },
    });

    if (user === null) {
        return res.status(404).json(errors.USER_NOT_FOUND);
    }
    delete (user as any).password;
    res.json({ status: "success", user });
});

router.post("/", async (req, res) => {
    const user: User & {birthdate: string} = req.body;
    const pass = user.password;
    try {
        const safePass =
            pass.match(/[A-Z]/) &&
            pass.match(/\d/) &&
            pass.match(/[a-z]/) &&
            pass.match(/.{8}/);
        if (!safePass) {
            res.status(400);
            res.json(errors.INVALID_PASSWORD);
            return;
        }
        user.password = await argon2.hash(user.password);
        user.email = user.email.toLowerCase();
        if (!user.email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
            res.status(400);
            res.json(errors.INVALID_EMAIL);
            return;
        }
        const created = await prisma.user.create({
            data: {
                ...user,
                birthdate: new Date(user.birthdate),
            },
        });
        delete (created as any).password;
        const token = jwt.sign({ userId: created.id }, JWT_SECRET, {
            expiresIn: "1h",
        });
        res.status(201).json({ status: "success", user: created });
        mailer.sendMail(
            {
                to: user.email,
                from: MAIL_USER,
                subject: "Verificación de correo electrónico",
                html: `<p>Para verificar su correo electrónico pinche <a href=${HOST}/verify?token=${token}>aquí</a></p>`,
            },
            function (err: any) {
                if (err) {
                    prisma.user.delete({ where: { id: user.id } });
                }
            }
        );
    } catch (e) {
        const err = e as PrismaClientKnownRequestError;
        if (err.code == "P2002") {
            res.status(403);
            res.json(errors.USER_ALREADY_EXISTS);
            return;
        }
        res.status(400);
        res.json(errors.UNKOWN_ERROR_CREATE_USER);
    }
});

router.post("/login", async (req, res) => {
    let { email, password } = req.body;
    if (typeof email != "string" || typeof password != "string") {
        res.status(400).json({
            status: "error",
            es: "Las credenciales tiene un formato invalido.",
            en: "Credentials have an invalid type",
        });
        return;
    }
    email = email.toLowerCase();
    const user = await prisma.user.findFirst({ where: { email } });
    if (user === null) {
        res.status(401);
        res.json(errors.UNREGISTERED_USER);
        return;
    }
    const isCorrect = await argon2.verify(user.password, password);
    if (!isCorrect) {
        res.status(401);
        res.json(errors.INCORRECT_PASSWORD);
        return;
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "48h" });
    res.setHeader("authorization", token);
    res.json({ authorization: token });
});

router.post("/change-password", async (req, res) => {
    const { token, password } = req.body;
    try {
        const { userId: id } = jwt.verify(token || "", JWT_SECRET, {}) as {
            userId: string;
        };
        const newPassword = await argon2.hash(password);
        const user = await prisma.user.update({
            data: { password: newPassword },
            where: { id },
        });
        delete (user as any).password;
        res.json({ status: "success", user });
    } catch (e) {
        if (e instanceof jwt.JsonWebTokenError) {
            res.status(401).json(errors.TOKEN_EXPIRED);
        } else {
            res.status(500).json(errors.INTERNAL_SERVER);
        }
    }
});

router.post("/verify", async (req, res) => {
    const { token } = req.body;

    try {
        const { userId: id } = jwt.verify(token || "", JWT_SECRET, {}) as {
            userId: string;
        };
        const user = await prisma.user.update({
            data: { isValidated: true },
            where: { id },
        });
        delete (user as any).password;
        res.json({ status: "success", user });
    } catch (e) {
        if (e instanceof jwt.JsonWebTokenError) {
            res.status(401).json(errors.TOKEN_EXPIRED);
        } else {
            res.status(500).json(errors.INTERNAL_SERVER);
        }
    }
});

router.patch("/", user(), async (req, res) => {
    // if you are staff or you are editting your own profile
    try {
        if (req.user?.isAdmin || req.user?.id == req.body.id) {
            delete req.body.email;
            if (req.user?.isAdmin === false) {
                delete req.body.isAdmin;
            }
            const password = req.body.password
                ? await argon2.hash(req.body.password)
                : undefined;
            const updated = await prisma.user.update({
                where: {
                    id: req.body.id,
                },
                data: { ...req.body, password },
            });
            const { password: _, ...user } = updated;
            res.json({ status: "success", user });
        } else {
            res.status(403).json(errors.UNAUTHORIZED);
        }
    } catch (e) {
        res.status(400).json(errors.BAD_REQUEST);
    }
});

router.delete("/:id", user({ adminsOnly: true }), async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.delete({
            where: {
                id,
            },
        });
        delete (user as any).password;

        res.json({ status: "success", user });
    } catch (e) {
        res.status(404).json(errors.USER_NOT_FOUND);
    }
});

// Interactions
router.get(
    "/:id/interactions",
    user({ adminsOnly: true }),
    async (req, res) => {
        const { id } = req.params;
        const interactions = await prisma.publicationInteraction.findMany({
            where: {
                userId: id,
            },
        });
        res.json(interactions);
    }
);

router.use((_err: Error, _req: any, res: any, _next: any) => {
    res.status(401).json(errors.UNAUTHORIZED);
});

export default router;
