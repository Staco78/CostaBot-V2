import express from "express";
import config from "../config";
import { authorizationMiddleware, errorWrapperMiddleware } from "./middlewares";
import login from "./login";
import { getServers, getServer } from "./servers";

namespace Server {
    const app = express();

    export function listen() {
        app.listen(config.server.port);
        console.log(`Server started at port ${config.server.port}`);
    }

    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url} from ${req.ip}`);
        next();
    });

    app.get("/redirect_auth", errorWrapperMiddleware(login));

    app.get("/api/servers/:id", authorizationMiddleware("/users/@me/guilds"), errorWrapperMiddleware(getServer));

    app.get("/api/servers", authorizationMiddleware("/users/@me/guilds"), errorWrapperMiddleware(getServers));

    app.use(express.static(config.server.publicFiles, { extensions: ["html"], index: "index.html" }));

    app.use((req, res) => {
        res.sendFile(`${config.server.publicFiles}/index.html`);
    });
}

export default Server;
