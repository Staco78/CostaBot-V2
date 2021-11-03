if [ -d "/dev/servers" ]; then
    echo "Config exist in /dev/servers"
    echo "Copying config to bot directory"
    cp -a -r /dev/servers/. /bot/servers/
    echo "Starting..."
    npm start
else
    echo "Config doesn't exist in /dev/servers"
    echo "Checking is bot is already configured"
    if [ -d "/bot/servers" ]; then
        echo "Bot is already configured"
        echo "Starting..."
        npm start
    else
        echo "Unable to start: bot not config"
        exit 1
    fi
fi