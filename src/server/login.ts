import fetch from "node-fetch";

import { Request, Response } from "express";
import config from "../config";

export default async function login(req: Request, res: Response) {
    const code = req.query.code;

    const body = new URLSearchParams();
    body.append("client_id", config.discord.client_id);
    body.append("client_secret", config.discord.client_secret);
    body.append("grant_type", "authorization_code");
    body.append("code", code as string);
    body.append("redirect_uri", config.discord.redirect_uri);

    const response = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        body,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    const json = await response.json();

    if (!json.access_token) {
        console.log("Website login invalid token", json);
        
        throw new Error("Invalid token");
    }

    res.cookie("token", json.access_token, { expires: new Date(new Date().getFullYear() * 2, 1) });

    res.redirect("/");
}
