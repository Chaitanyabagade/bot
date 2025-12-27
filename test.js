const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const https = require('https');
const path = require('path');

let isDone = false;
let isSent = false;
let online = false;

// HTTPS options for notification
const options = {
    hostname: 'darkslategray-lion-860323.hostingersite.com',
    path: '/fire/sendNotification.php',
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html',
        'Connection': 'keep-alive'
    }
};

// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: {
        headless: false, // show browser GUI
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process'
        ]
    }
});

// QR code
client.on('qr', qr => {
    console.log('Scan this QR code:');
    qrcode.generate(qr, { small: true });
});

// Ready
client.on('ready', async () => {
    console.log('✅ WhatsApp Client READY');

    if (isDone) return;

    try {
        const phone = '918087472049';
        const page = await client.pupPage;
        const url = `https://web.whatsapp.com/send?phone=${phone}`;

        console.log(`Opening chat with ${phone}...`);
        await page.goto(url);

        // Wait for chat to load
        await page.waitForSelector("._21S-L", { timeout: 20000 });
        isDone = true;

        // Periodically check online status
        setInterval(async () => {
            try {
                await page.waitForSelector('div.x1iyjqo2.x6ikm8r.x10wlt62.x1mzt3pk', { timeout: 5000 });
                await page.click('div.x1iyjqo2.x6ikm8r.x10wlt62.x1mzt3pk');

                const isOnline = await page.evaluate(() => {
                    const span = document.querySelector('span[title="online"]');
                    return !!span;
                });

                if (isOnline) {
                    if (!online) console.log('🟢 User is ONLINE');
                    online = true;

                    if (!isSent) {
                        const req = https.request(options, res => {
                            console.log(`🌐 Notification Sent (Status ${res.statusCode})`);
                        });
                        req.on('error', err => console.error('❌ HTTPS Error:', err));
                        req.end();
                        isSent = true;
                    }

                } else {
                    if (online) console.log('🔴 User is OFFLINE');
                    online = false;
                    isSent = false;
                }

            } catch (err) {
                console.log('❌ Error checking online status:', err.message);
            }
        }, 2000);

    } catch (err) {
        console.log('❌ INIT ERROR:', err.message);
    }
});

// Initialize
client.initialize();
