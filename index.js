const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const https = require('https');

const options = {
    hostname: 'darkslategray-lion-860323.hostingersite.com',
    path: '/fire/sendNotification.php',
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Referer': 'https://google.com',
        'Origin': 'https://google.com',
    }
};
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process'
        ]
    }
});

client.on('qr', qr => {
    console.log('Scan this QR code with your phone:');
    console.log(qr);
});

let isdone = 0;
let isSent = 0;
let online = 0;

// ✅ Added variables for tracking online duration
let onlineStartTime = null;
let previousOnlineDuration = 0;

if (isdone === 0) {
    client.on("authenticated", () => {
        console.log("✅ Authenticated successfully");
    });

    client.on("authenticated", () => {
        console.log("⌛ Waiting 20 seconds for WhatsApp to fully load...");
        setTimeout(async () => {
            console.log("⚡ Forcing READY now!");
            client.emit("ready"); // trigger ready yourself
        }, 20000);
    });
}

client.on('ready', async () => {
    console.log('✅ WhatsApp client is ready!');

    if (isdone === 0) {
        const page = await client.pupPage;
        const phone = '918010036342';
        const url = `https://web.whatsapp.com/send?phone=${phone}`;
        console.log(`Opening chat with ${phone}...`);
        await page.goto(url);
        isdone = 1;

        await page.waitForSelector("._21S-L", { timeout: 5000 }).catch(() => {
            console.log("❌ Chat did not load.");
        });

        setInterval(async () => {
            await page.waitForSelector('div.x1iyjqo2.x6ikm8r.x10wlt62.x1mzt3pk');
            await page.click('div.x1iyjqo2.x6ikm8r.x10wlt62.x1mzt3pk');

            try {
                const isOnline = await page.evaluate(() => {
                    const span = document.querySelector('span[title="online"]');
                    return !!span;
                });

                if (isOnline) {
                    if (!online) {
                        // ✅ User just came online
                        onlineStartTime = Date.now();
                        console.log('✅ User is online (started at)', new Date(onlineStartTime).toLocaleTimeString());

                        // ✅ Send API request instantly with previous duration
                        const apiPath = `/fire/sendNotification.php?prev_time=${previousOnlineDuration}`;
                        const reqOptions = { ...options, path: apiPath };

                        const req = https.request(reqOptions, res => {
                            console.log(`📨 Instant Email Sent! Status Code: ${res.statusCode}`);
                            res.on('data', d => {
                                process.stdout.write(d);
                            });
                        });

                        req.on('error', error => {
                            console.error('❌ Error:', error);
                        });

                        req.end();
                        isSent = 1; // prevent duplicate during same session
                    }
                    online = 1;
                } else {
                    if (online && onlineStartTime) {
                        // ✅ User just went offline → calculate session duration
                        const sessionDuration = Math.floor((Date.now() - onlineStartTime) / 1000);
                        previousOnlineDuration = sessionDuration;
                        console.log(`⏱️ User was online for ${previousOnlineDuration} seconds in the last session`);
                        onlineStartTime = null;
                    }
                    online = 0;
                    isSent = 0; // reset for next session
                }

            } catch (err) {
                console.log('❌ Error checking online status:', err.message);
            }
        }, 2000);
    }
});

client.initialize();
