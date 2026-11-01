require('dotenv').config();
const { Bot } = require('grammy');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const bot = new Bot(process.env.BOT_TOKEN);
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const USERS_FILE = path.join(__dirname, 'users.json');

function getUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function saveUser(user, chatId) {
    let users = getUsers();
    const existingIndex = users.findIndex(u => u.id === user.id && u.chatId === chatId);
    
    const userData = {
        id: user.id,
        chatId: chatId,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username ? `@${user.username}` : 'No username'
    };

    if (existingIndex >= 0) {
        users[existingIndex] = userData;
    } else {
        users.push(userData);
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

bot.on('message', async (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        if (ctx.from) {
            saveUser(ctx.from, ctx.chat.id);
        }
    }
});

app.get('/api/users', (req, res) => {
    res.json(getUsers());
});

app.post('/api/action', async (req, res) => {
    const { chatId, userId, action } = req.body;

    try {
        if (action === 'promote') {
            await bot.api.promoteChatMember(chatId, userId, {
                is_anonymous: false,
                can_manage_chat: true,
                can_delete_messages: true,
                can_manage_video_chats: true,
                can_restrict_members: true,
                can_promote_members: false,
                can_change_info: true,
                can_invite_users: true,
                can_pin_messages: true
            });
            res.json({ success: true, message: "Foydalanuvchi Admin qilindi!" });
        } 
        else if (action === 'ban') {
            await bot.api.banChatMember(chatId, userId);
            res.json({ success: true, message: "Foydalanuvchi guruhdan ban qilindi!" });
        } 
        else if (action === 'mute') {
            await bot.api.restrictChatMember(chatId, userId, {
                permissions: { can_send_messages: false }
            });
            res.json({ success: true, message: "Foydalanuvchi mutega olindi!" });
        }
        else if (action === 'unmute') {
            await bot.api.restrictChatMember(chatId, userId, {
                permissions: { 
                    can_send_messages: true,
                    can_send_media_messages: true,
                    can_send_other_messages: true,
                    can_add_web_page_previews: true
                }
            });
            res.json({ success: true, message: "Cheklov olib tashlandi!" });
        }
        else {
            res.status(400).json({ success: false, message: "Noma'lum amal!" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Xatolik yuz berdi: " + error.message });
    }
});

// Bot panel buyrug'i (Internetdagi xosting havolasini shu yerga yozasiz)
bot.command('panel', async (ctx) => {
    await ctx.reply("🎛 Guruh boshqaruv panelini ochish:", {
        reply_markup: {
            inline_keyboard: [[
                { text: "🚀 Panelni Ochish", web_app: { url: "SIZNING_INTERNETDAGI_HAVOLANGIZ" } }
            ]]
        }
    });
});

const PORT = process.env.PORT || 3000;

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`==================================================`);
    console.log(` Server muvaffaqiyatli ishga tushdi!`);
    console.log(` 1. Kompyuter uchun:       http://localhost:${PORT}`);
    console.log(` 2. Wi-Fi tarmoq uchun:    http://${localIp}:${PORT}`);
    console.log(`==================================================`);
});

bot.start();