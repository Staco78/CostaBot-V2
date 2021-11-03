function checkEnv(envKey: string, x = true): string {
    if (process.env[envKey]) return process.env[envKey] as string;

    if (x) {
        require("dotenv").config();
        return checkEnv(envKey, false);
    }

    throw new Error("Missing env variable " + envKey);
}

const config: config = {
    bot: {
        token: checkEnv("bot_token"),
    },
    database: {
        url: checkEnv("db_url"),
    },
    discord: {
        client_id: checkEnv("discord_client_id"),
        client_secret: checkEnv("discord_client_secret"),
        redirect_uri: checkEnv("discord_redirect_uri"),
    },
    server: {
        active: Boolean(parseInt(checkEnv("server_active"))),
        port: parseInt(checkEnv("server_port")),
    },
    googleApiKey: checkEnv("google_api_key"),
    websiteUrl: checkEnv("website_url"),
};

declare interface config {
    bot: {
        token: string;
    };
    database: {
        url: string;
    };
    discord: {
        client_id: string;
        client_secret: string;
        redirect_uri: string;
    };
    server: {
        active: boolean;
        port: number;
    };
    googleApiKey: string;
    websiteUrl: string;
}

export default config;
