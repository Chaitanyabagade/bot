const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const https = require('https');
const path = require('path');


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
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '.wwebjs_auth')  // 👈 absolute path fix
    }),
    puppeteer: {
        headless: false,
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
client.on('ready', async () => {
    console.log('✅ WhatsApp client is ready!');

    if (isdone === 0) {
        const page = await client.pupPage;
        const phone = '918087472049';
        const url = `https://web.whatsapp.com/send?phone=${phone}`;
        console.log(`Opening chat with ${phone}...`);
        await page.goto(url);
        isdone = 1;

        // Wait for chat to load
        await page.waitForSelector("._21S-L", { timeout: 20000 }).catch(() => {
            console.log("❌ Chat did not load.");
        });

        // Start checking online status every 5 seconds
        setInterval(async () => {
            // Wait for the element
            await page.waitForSelector('div.x1iyjqo2.x6ikm8r.x10wlt62.x1mzt3pk');
            await page.click('div.x1iyjqo2.x6ikm8r.x10wlt62.x1mzt3pk');

            try {
                const isOnline = await page.evaluate(() => {
                    const span = document.querySelector('span[title="online"]');
                    return !!span;
                });
                if (isOnline) {
                    console.log('✅ User is online');
                    online = 1;
                } else {
                    console.log('❌ User is offline');
                    online = 0;
                    isSent = 0;
                }
                if (isSent === 0 && online === 1) {
                    const req = https.request(options, res => {
                        console.log(`✅ Status Code: ${res.statusCode}`);

                        res.on('data', d => {
                            process.stdout.write(d);
                        });
                    });

                    req.on('error', error => {
                        console.error('❌ Error:', error);
                    });

                    req.end();
                    isSent = 1;
                }

            } catch (err) {
                console.log('❌ Error checking online status:', err.message);
            }
        }, 2000); // every 5 seconds
    }
});

client.initialize();