import { PrismaClient, User } from "@prisma/client";
import { Router } from "express";

import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { JWT_SECRET, user } from "./middleware";
import errors from "../errors";



import nodemailer from "nodemailer";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";



const prisma = new PrismaClient();
const router = Router();


const MAIL_USER = process.env["MAIL_USER"];
const MAIL_PASS = process.env["MAIL_PASS"];
const HOST = process.env["HOST"] || "http://localhost:5173";
const transporter = nodemailer.createTransport({
    service: "hotmail",
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
        // ciphers: 'SSLv3'
    }
});

/**
 * returns the queried user models.
 * TODO: exclude password   
 *                  
 */
router.get("/", user({ adminsOnly: true }), async (req, res) => {
    const skip = Number(req.query.skip) || undefined;
    const take = Number(req.query.take) || undefined;


    const users = await prisma.user.findMany({
        skip,
        take,
        orderBy: {
            createdAt: "desc"
        }
    });



    res.json({ users });
});

/** 
 * returns the current authenticated user if any.
 * 
 */
router.get("/me", user(), async (req, res: any) => {
    const user = req.user;
    delete (user as any)?.password;
    res.json({ user });
});

/**
 *  Returns the queried user by their id
 *       
 */
router.get("/:id", user({ adminsOnly: true }), async (req, res) => {
    const { id } = req.params;
    const user = await prisma.user.findFirst({
        where: { id: Number(id) }
    });
    if (user === null) {
        return res.status(404).json(errors.USER_NOT_FOUND);
    }
    delete (user as any).password;
    res.json({ status: "success", user });
});

/**
 * @swagger
 * /user:
 *     post: 
 *      description: Creates a new user.
 *      consumes: 
 *          - application/json
 *      requestBody:
 *          required: true
 *          content: 
 *              application/json: 
 *                  schema: 
 *                      $ref: '#/components/schemas/UserInput'            
 *      responses: 
 *          '201': 
 *              $ref: '#/components/responses/User'
 *          '400':
 *              $ref: '#/components/responses/BadRequest'
 *          '403':
 *              description: User already exist.
 *          '500': 
 *              description: Internal server error. Likely the user is already signed up. 
 */
router.post("/", async (req, res) => {
    try {
        const user: User = req.body;
        console.log(user);
        const pass = user.password;
        const safePass = (
            pass.match(/[A-Z]/) && pass.match(/\d/) &&
            pass.match(/[a-z]/) && pass.match(/.{8}/)
        );
        if (!safePass) {
            res.status(400);
            res.json(errors.INVALID_PASSWORD);
            return;
        }
        user.password = await argon2.hash(user.password);
        user.email = user.email.toLowerCase();
        if (!user.email.match(/^\S+@(?:\S+\.)?(?:puc|uc)\.cl$/)) {
            res.status(400);
            res.json(errors.INVALID_EMAIL);
            return;
        }
        user.isAdmin = false;
        user.isVerified = false;
        const created = await prisma.user.create({
            data: user
        });
        delete (created as any).password;
        const token = jwt.sign({ userId: created.id, }, JWT_SECRET, { expiresIn: "1h" });

        res.status(201).json({ status: "success", user: created });
        transporter.sendMail({
            to: user.email,
            from: MAIL_USER,
            html: `<p>Para verificar su correo electrónico pinche <a href=${HOST}/verify?token=${token}>aquí</a></p>`,
        }, function (err: any) {
            if (err) {
                console.log(err);
                prisma.user.delete({ where: { id: user.id } });
            }
        });
    } catch (e) {
        const err = e as PrismaClientKnownRequestError;
        if (err.code == "P2002") {
            res.status(403);
            res.json(errors.USER_ALREADY_EXISTS);
            return;
        }
        console.log(e);
        res.status(400);
        res.json(errors.UNKOWN_ERROR_CREATE_USER);
    }
});

/**
 *      description: Logs in to user account
 *      
 *              
 */
router.post("/login", async (req, res) => {
    let { email, password } = req.body;
    if (typeof (email) != "string" || typeof (password) != "string") {
        res.status(400).json({ status: "error", es: "Las credenciales tiene un formato invalido.", en: "Credentials have an invalid type" });
        return;
    }
    email = email.toLowerCase();
    const user = await prisma.user.findFirst({ where: { email } });
    if (user === null) {
        res.status(401);
        res.json(errors.UNREGISTERED_USER);
        return;
    }
    // if (!user.isVerified) {
    //     res.status(403);
    //     res.json(errors.UNVALIDATED);
    //     const token = jwt.sign({ userId: user.id, }, JWT_SECRET, { expiresIn: "1h" });

    //     transporter.sendMail({
    //         to: email,
    //         from: MAIL_USER,
    //         subject: "Autentificacion Pagepals",
    //         html: `<p>Para verificar su correo electrónico pinche <a href=${HOST}/verify?token=${token}>aquí</a></p>`,
    //     }, (err: unknown) => {
    //         if (err) console.log("err", err);

    //     });
    //     return;
    // }

    const isCorrect = await argon2.verify(user.password, password);
    if (!isCorrect) {
        res.status(401);
        res.json(errors.INCORRECT_PASSWORD);
        return;
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "48h" });
    res.setHeader("authorization", token);
    res.json({ "authorization": token, });
});

/**
 * @swagger
 * /user/{id}/emergency:
 *     post: 
 *       description: Send a email when a user report emergency/accident.
 *       consumes: 
 *         - application/json
 *       requestBody:
 *         required: true
 *         content: 
 *           application/json: 
 *             schema: 
 *               type: object
 *               properties: 
 *                 tipo: 
 *                   type: string
 *       responses: 
 *          '204': 
 *              description: Emergency email send correctly
 *          '404':
 *              description: User not found.
 *          '500': 
 *              description: Internal server error. Tipicatly the email could not be sent.
 */
router.post("/:id/emergency", async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo } = req.body;
        //const time = new Date(); ///REVISAR
        const asunto = tipo === "accidente" ? "un accidente" : "una emergencia";

        const user = await prisma.user.findFirst({
            where: { id: Number(id) }
        });

        if (user === null) {
            return res.status(404).json(errors.USER_NOT_FOUND);
        }
        transporter.sendMail({
            to: MAIL_USER, ////IMPORTANTE: cambiar al mail al que se tiene que enviar el correo
            cc: user.email,
            from: MAIL_USER,
            subject: `${user.name} ha reportado ${asunto}`,
            html: `<p>El usuario ${user.email} ha reportado ${asunto}.\n \n \n 
                [Datos del usuario]\n \n Nombre: ${user.name} ${user.lastName} \n email:${user.email}\n \n \n`,
        }, function (err: any) {
            if (err) {
                res.status(500).json({ status: "error", es: "No se pudo enviar el correo.", en: "" });
            } else {
                res.status(204).json({ status: "success" });
            }
        });
    } catch {
        res.status(404).json(errors.USER_NOT_FOUND);
    }
});

/**
 * @swagger
 * /user/send-reset-password:
 *     post: 
 *      description: Send email to change forgotten password for user.  
 *      consumes: 
 *          - application/json
 *      requestBody:
 *          required: true
 *          content: 
 *              application/json: 
 *                  schema: 
 *                      type: object
 *                      properties: 
 *                          email: 
 *                              type: string           
 *      responses: 
 *          '200': 
 *              description: Correct validation of the user
 *          '401': 
 *              description: Token is incorrect
 *          '404':
 *              description: User not found.
 *          '500': 
 *              description: Internal server error. Likely the user is already signed up. 
 */
router.post("/send-reset-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findFirst({ where: { email } });
        if (user === null) {
            res.status(401);
            res.json(errors.UNREGISTERED_USER);
            return;
        }
        const token = jwt.sign({ userId: user.id, }, JWT_SECRET, { expiresIn: "1h" });
        transporter.sendMail({
            to: email,
            from: MAIL_USER,
            subject: "Resetear contraseña Sibico",
            html: `<p>se ha solicitado restablecer la contraseña de ${user.email}. \n \n Para modificarla ingrese aqui: <a href=${HOST}/reset-password?token=${token}>aquí</a></p>`,
        }, function (err: any) {
            if (err) {
                res.status(500).json({ status: "error", es: "No se pudo enviar el correo.", en: "" });
            } else {
                res.status(200).json({ status: "success" });
            }
        });
    } catch {
        res.status(404).json(errors.USER_NOT_FOUND);
    }

});


/**
 * @swagger
 * /user/change-password:
 *     post: 
 *      description: Change forgotten password for user.
 *      consumes: 
 *          - application/json
 *      requestBody:
 *          required: true
 *          content: 
 *              application/json: 
 *                  schema: 
 *                      $ref: '#/components/schemas/ChangePasswordInput'            
 *      responses: 
 *          '200': 
 *              description: Correct validation of the user
 *          '401': 
 *              description: Token is incorrect
 *          '500': 
 *              description: Internal server error. Likely the user is already signed up. 
 */
router.post("/change-password", async (req, res) => {
    const { token, password } = req.body;
    try {
        const { userId: id } = jwt.verify(token || "", JWT_SECRET, {}) as { userId: number; };
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
/**
 * @swagger
 * /user/validate/:
 *     post: 
 *      description: Validate a new user.
 *      consumes: 
 *          - application/json
 *      requestBody:
 *          required: true
 *          content: 
 *              application/json: 
 *                  schema: 
 *                      $ref: '#/components/schemas/TokenInput'            
 *      responses: 
 *          '200': 
 *              description: Responds with the user if it succeeds.
 *              content:
 *                  application/json: 
 *                      schema:
 *                          $ref: '#/components/schemas/User'
 *          '403':
 *             description: Invalid token.
 *          '500':
 *            description: Internal server error.
 */
router.post("/verify", async (req, res) => {
    const { token } = req.body;

    try {
        console.log(jwt.verify(token, JWT_SECRET, {}));
        const { userId: id } = jwt.verify(token || "", JWT_SECRET, {}) as { userId: number; };

        const user = await prisma.user.update({
            data: { isVerified: true, },
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

/**
 * @swagger
 * /user/:
 *     patch: 
 *      description: Updates user information.
 *      parameters: 
 *          - $ref: '#/components/parameters/x-access-token' 
 *      consumes: 
 *          - application/json
 *      requestBody:
 *          required: true
 *          content: 
 *              application/json: 
 *                  schema: 
 *                      $ref: '#/components/schemas/UserInput'
 *      responses: 
 *          '200': 
 *              $ref: '#/components/responses/User'
 *          '404': 
 *              $ref: '#/components/responses/NotFound'
 *          '401': 
 *              $ref: '#/components/responses/Unauthorized'
 *          '403':
 *              description: User is not validated.
 */

router.patch("/", user(), async (req, res) => {
    // if you are staff or you are editting your own profile
    try {
        if (req.user?.isAdmin || req.user?.id == req.body.id) {
            delete req.body.email;
            if (req.user?.isAdmin === false) {
                delete req.body.isAdmin;
            }
            const password = req.body.password ? await argon2.hash(req.body.password) : undefined;
            const updated = await prisma.user.update({
                where: {
                    id: req.body.id,
                },
                data: { ...req.body, password }
            });
            const { password: _, ...user } = updated;
            res.json({ status: "success", user });
        } else {
            res.status(403).json(errors.UNAUTHORIZED);
        }

    } catch (e) {
        console.log(e);
        res.status(400).json(errors.BAD_REQUEST);
    }
});


/**
 * @swagger
 * /user/{id}:
 *     delete: 
 *      description: Deletes the user. Only admin members can delete users. 
 *      parameters: 
 *        - $ref: '#/components/parameters/userId' 
 *        - $ref: '#/components/parameters/x-access-token' 
 *      responses: 
 *          '200': 
 *              $ref: '#/components/responses/User'
 *          '404': 
 *              $ref: '#/components/responses/NotFound'
 *          '401': 
 *              $ref: '#/components/responses/Unauthorized'
 *          '403': 
 *              $ref: '#/components/responses/Forbidden'
 */
router.delete("/:id", user({ adminsOnly: true }), async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.delete({
            where: {
                id: Number(id),
            }
        });
        delete (user as any).password;

        res.json({ status: "success", user });
    } catch (e) {
        res.status(404).json(errors.USER_NOT_FOUND);
    }
});

router.use((_err: Error, _req: any, res: any, _next: any) => {
    res.status(401).json(errors.UNAUTHORIZED);
});

export default router; 