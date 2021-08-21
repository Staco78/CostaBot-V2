import { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";

export function authorizationMiddleware(link?: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (typeof req.headers.authorization !== "string") {
            res.status(401).end("Not authorized");
            return;
        }

        const response = await fetch(`https://discord.com/api/v9${link ?? "/users/@me"}`, { headers: { Authorization: req.headers.authorization } });

        if (response.status !== 200) {
            if (response.status === 401) {
                res.status(401).end("Not authorized");
                return;
            }
            res.status(500).end("Internal server error");
            console.log("Disord api error:", JSON.stringify(await response.json()));

            return;
        }

        const json = await response.json();

        (req as any).data = json;

        next();
    };
}
