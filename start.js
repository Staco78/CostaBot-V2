const fs = require("fs");
const { spawn } = require("child_process");

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

function start() {
    replaceAll();
    spawn("npm", ["start"], { stdio: "inherit" });
}

function replaceAll() {
    let data = fs.readFileSync("public/renderer.js").toString();

    function replace(key, value) {
        data = data.replace(key, value);
        console.log(`${key} replaced by ${value}`);
    }

    replace("REPLACE_REDIRECT_URL", process.env.discord_redirect_uri);
    replace("REPLACE_CLIENT_ID", process.env.discord_client_id);

    fs.writeFileSync("public/renderer.js", data);
}

process.on("SIGTERM", () => {
    process.exit();
});
