const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

function findChrome() {
    const paths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/nix/var/nix/profiles/default/bin/chromium'
    ];
    for (const p of paths) {
        if (fs.existsSync(p)) return p;
    }
    try {
        const { execSync } = require('child_process');
        return execSync('which chromium || which chromium-browser || which google-chrome').toString().trim();
    } catch {}
    return undefined;
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process'
        ],
        executablePath: findChrome() || undefined
    }
});

let isReady = false;

client.on('qr', (qr) => {
    console.log('QR Code generated');
    qrcode.toDataURL(qr, (err, url) => {
        if (!err) app.locals.qrUrl = url;
    });
});

client.on('ready', () => {
    console.log('WhatsApp connected!');
    isReady = true;
});

client.on('message', async (msg) => {
    if (msg.from.endsWith('@g.us')) return;
    if (msg.fromMe) return;
    const body = msg.body.toLowerCase().trim();
    console.log('Message:', body);
    const chat = await msg.getChat();
    await chat.sendStateTyping();
    setTimeout(async () => {
        await msg.reply(getReply(body));
        await chat.clearState();
    }, 1000 + Math.random() * 1000);
});

client.initialize();

function getReply(m) {
    if (m.match(/salam|assalam|hello|hi|hey|aoa/)) return 'Walaikum Assalam! Main AI assistant hoon. Order status, prices, timing poochein!';
    if (m.match(/order|status|track/)) return 'Order number bhejien jaise VO-7842, main status bata dunga!';
    if (m.match(/price|rate|kitna|plan/)) return 'Plans: Starter PKR 5k/mo, Pro PKR 15k/mo, Enterprise Custom. Detail: 0320-9206957';
    if (m.match(/time|timing|baje/)) return 'Mon-Sat: 9AM-9PM, Sun: 2PM-8PM. Bot 24/7 available!';
    if (m.match(/location|kahan|address/)) return 'Lahore, Pakistan. WhatsApp: 0320-9206957';
    if (m.match(/payment|jazz|easypaisa|bank/)) return 'JazzCash: 0320-9206957, EasyPaisa: 0320-9206957';
    if (m.match(/shukriya|thank/)) return 'Shukriya! Koi aur sawal ho toh poochein. 0320-9206957';
    return 'Ji, note kar liya. Detail ke liye 0320-9206957 pe call karein!';
}

app.get('/api/qr', (req, res) => {
    if (isReady) return res.json({ status: 'connected' });
    if (app.locals.qrUrl) return res.json({ status: 'qr', qr: app.locals.qrUrl });
    return res.json({ status: 'loading' });
});

app.get('/api/status', (req, res) => {
    res.json({ connected: isReady });
});

app.listen(PORT, () => {
    console.log('Server started: http://localhost:' + PORT);
});
