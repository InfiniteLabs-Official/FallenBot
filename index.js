require('dotenv').config();
const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Bot is alive");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');

console.log("Starting bot...");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.activeApps = new Map();
client.cooldowns = new Map();

const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

console.log("TOKEN EXISTS:", !!process.env.TOKEN);
console.log("Logging in...");
(async () => {
    try {
        console.log("Attempting login...");
        await client.login(process.env.TOKEN);
        console.log("Login complete");
    } catch (err) {
        console.error("LOGIN ERROR:", err);
    }
})();
