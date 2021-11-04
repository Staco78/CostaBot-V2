const fs = require("fs");
const { spawn } = require("child_process");

const args = process.argv.slice(2);

if (args.includes("--dev")) {
    start(true);
} else {
    if (fs.existsSync("/dev/servers")) {
        console.log("Config exist in /dev/servers");
        console.log("Copying config to bot directory");
        fs.cpSync("/dev/servers", "/bot/servers", { force: true, recursive: true });
        console.log("Starting...");
        start();
    } else {
        console.log("Config doesn't exist in /dev/servers");
        console.log("Checking is bot is already configured");
        if (fs.existsSync("/bot/servers")) {
            console.log("Bot is already configured");
            console.log("Starting...");
            start();
        } else {
            console.log("Unable to start: bot not config");
            process.exit(1);
        }
    }
}

function start(dev = false) {
    replaceAll();
    if (dev) {
        spawn("npm", ["run", "dev"], { stdio: "inherit" });
    } else {
        spawn("npm", ["start"], { stdio: "inherit" });
    }
}

function replaceAll() {
    let buff = fs.readFileSync("public/renderer.js");

    function replace(key, value) {
        const index = buff.indexOf(key);
        if (index === -1) return;

        const before = buff.slice(0, index);
        const after = buff.slice(index + key.length);
        buff = Buffer.concat([before, Buffer.from(value), after]);

        console.log(`${key} replaced by ${value}`);
    }

    replace("REPLACE_REDIRECT_URL", process.env.discord_redirect_uri);
    replace("REPLACE_CLIENT_ID", process.env.discord_client_id);

    fs.writeFileSync("public/renderer.js", buff);
}

process.on("SIGTERM", () => {
    process.exit();
});

process.on("SIGINT", () => {
    process.exit();
});
