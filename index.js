require('dotenv').config();
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Alive"));
app.listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits } = require('discord.js');

console.log("Starting minimal bot...");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
    console.log("✅ LOGGED IN:", client.user.tag);
});

client.login(process.env.TOKEN)
    .then(() => console.log("Login success"))
    .catch(err => console.error("LOGIN ERROR:", err));
