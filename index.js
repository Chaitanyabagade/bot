const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const express = require("express");
const path = require('path');
const app = express();
app.use(express.json());

let clientReady = false;

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '.wwebjs_auth2')
    }),
    puppeteer: {
        headless: false,   // keep false first time to scan QR
        args: ['--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer'
        ]
    }
});


client.on('qr', qr => {
    console.log("SCAN THIS QR");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log("WHATSAPP CLIENT READY ✔");
    clientReady = true;
});

/* ---------- HTTP API ---------- */
app.post("/send", async (req, res) => {
    if (!clientReady) {
        return res.status(503).json({ error: "WhatsApp client not ready" });
    }

    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: "number and message required" });
    }

    const chatId = number + "@c.us";

    try {
        await client.sendMessage(chatId, message);
        return res.json({ success: true, sentTo: number });
    } catch (err) {
        console.error("SEND ERROR:", err);
        return res.status(500).json({ error: "Failed to send message" });
    }
});

/* ---------- START SERVERS ---------- */
client.initialize();

app.listen(3000, () => {
    console.log("HTTP Server running on PORT 3000");
});  