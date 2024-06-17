import { PrismaClient, User } from "@prisma/client";
import { Response, NextFunction, Request } from "express";
import jwt from "jsonwebtoken";
import process from "process";

export const JWT_SECRET = process.env["JWT_SECRET"] || Math.random() + "";


const prisma = new PrismaClient();



declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}
// declare module 'express-serve-static-core' {
//     interface Request {
//         user?: User;
//     }

// }

interface Options {
    /**
     * If optional then the middleware won't respond with an error
     * in case the user isn't authenticated. This way the handler 
     * can manage those cases. It defaults to false. 
     */
    optional?: boolean;
    /**
     * It is used to respond with a forbidden status for 
     * admin only content. It defaults to false. 
     */
    adminsOnly?: boolean;


}
/**
 * This is authentication middleware, it can be used to 
 * fetch the user from the database automatically. By default 
 * this middlware will respond with an error if the user
 * is not logged in. This can be customized by setting optional to `true`. 
 * @param options - used to customize the behavior of the middleware. 
 * @returns {undefined}
 * @example
 * This is how you would use it for an admin panel
 * ```ts
 * import { user, Request } from "../user/middleware";
 * router.get("/admin-panel", user({adminsOnly: true}), (req: Request, res) => {
 *     // ... // 
 * }); 
 * ```
 */
export function user(options?: Options) {
    return async function middleware(req: Request, res: Response, next: NextFunction) {
        const header = req.headers["authorization"] || "";
        const regex = header.match(/^Bearer (.+)$/) || [];
        const token = regex[1];

        if (typeof (token) === "string") {
            try {
                req.user = await fetchUser(token);
                if (!req.user?.isAdmin && options?.adminsOnly) {
                    return forbidden(res);
                } else {
                    return next();
                }
            } catch (e) {
                return expired(res, next, options);
            }
        }
        return unauthenticated(res, next, options);
    };
}

async function fetchUser(token: string) {
    const { id } = jwt.verify(token, JWT_SECRET, {}) as { id: number; };
    return await prisma.user.findFirst({ where: { id } }) || undefined;
}

// returns forbidden if admins or users only.
function forbidden(res: Response) {
    res.status(403)
        .json({
            message: "No tiene permiso para acceder a este recurso.",
        });

}

function expired(res: Response, next: NextFunction, options?: Options) {
    if (options?.optional) {
        next();
    } else {
        res.status(401)
            .json({
                message: "Su sesión ha expirado",
            });
    }
}

function unauthenticated(res: Response, next: NextFunction, options?: Options,) {
    if (options?.optional) {
        next();
    } else {
        res.status(401)
            .json({
                message: "Tienes que ingresar sesión para acceder a este recurso.",
            });
    }
}
