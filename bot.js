const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const TOKEN = process.env.TOKEN;
const FILM_KANAL_ID = process.env.FILM_KANAL_ID;

const DOSYA_YOLU = path.join(__dirname, 'filmler.json');
const IZLENEN_DOSYA_YOLU = path.join(__dirname, 'izlenenler.json');

function dosyaOku(yol) {
    if (!fs.existsSync(yol)) {
        fs.writeFileSync(yol, JSON.stringify([], null, 2));
        return [];
    }
    try {
        const data = fs.readFileSync(yol, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

function dosyaYaz(yol, veri) {
    fs.writeFileSync(yol, JSON.stringify(veri, null, 2));
}

client.once('ready', () => {
    console.log(`Bot aktif: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. Film Ekleme Komutu: !ekle Interstellar
    if (command === 'ekle') {
        const filmAdi = args.join(' ').trim();
        if (!filmAdi) {
            return message.reply('Lütfen eklemek istediğin filmin adını yaz. Örnek: `!ekle Interstellar`');
        }

        let filmler = dosyaOku(DOSYA_YOLU);
        let izlenenler = dosyaOku(IZLENEN_DOSYA_YOLU);

        if (filmler.map(f => f.toLowerCase()).includes(filmAdi.toLowerCase())) {
            return message.reply(`⚠️ "${filmAdi}" zaten aktif film havuzunda var!`);
        }
        if (izlenenler.map(f => f.toLowerCase()).includes(filmAdi.toLowerCase())) {
            return message.reply(`⚠️ "${filmAdi}" daha önceden izlenenler listesinde yer alıyor!`);
        }

        filmler.push(filmAdi);
        dosyaYaz(DOSYA_YOLU, filmler);

        return message.reply(`✅ **"${filmAdi}"** başarıyla film havuzuna eklendi! (Toplam havuz: ${filmler.length})`);
    }

    // 2. Çark Çevirme Komutu: !çevir (Türkçe karakter uyumlu)
    if (command === 'çevir' || command === 'cevir') {
        let filmler = dosyaOku(DOSYA_YOLU);

        if (filmler.length === 0) {
            return message.reply('🎬 Havuzda hiç film kalmadı! Önce `!ekle [film adı]` ile yeni filmler ekleyin.');
        }

        const msg = await message.channel.send('🎡 Çark dönüyor, gecenin filmi seçiliyor...');

        setTimeout(async () => {
            const randomIndex = Math.floor(Math.random() * filmler.length);
            const secilenFilm = filmler[randomIndex];

            filmler.splice(randomIndex, 1);
            dosyaYaz(DOSYA_YOLU, filmler);

            let izlenenler = dosyaOku(IZLENEN_DOSYA_YOLU);
            izlenenler.push(secilenFilm);
            dosyaYaz(IZLENEN_DOSYA_YOLU, izlenenler);

            await msg.edit(`🎉 **Çarktan çıkan film:** **${secilenFilm}**! \n*(Bu film havuzdan çıkarıldı ve izlenenlere taşındı. Kalan film: ${filmler.length})*`);
        }, 2000);
    }

    // 3. Aktif Listeyi Görme Komutu: !liste
    if (command === 'liste') {
        let filmler = dosyaOku(DOSYA_YOLU);

        if (filmler.length === 0) {
            return message.reply('📂 Film havuzu şu an bomboş.');
        }

        const listeStr = filmler.map((f, i) => `${i + 1}. ${f}`).join('\n');
        return message.reply(`📋 **Havuzdaki Filmler (${filmler.length}):**\n${listeStr}`);
    }

    // 4. İzlenenleri Görme Komutu: !izlenenler
    if (command === 'izlenenler') {
        let izlenenler = dosyaOku(IZLENEN_DOSYA_YOLU);

        if (izlenenler.length === 0) {
            return message.reply('📭 Henüz hiç film izlenmemiş (veya çarktan seçilmemiş).');
        }

        const listeStr = izlenenler.map((f, i) => `${i + 1}. ${f}`).join('\n');
        return message.reply(`🎞️ **Daha Önce İzlenen Filmler (${izlenenler.length}):**\n${listeStr}`);
    }

    // 5. Film Silme Komutu: !sil veya !sil [Sıra Numarası]
    if (command === 'sil') {
        let filmler = dosyaOku(DOSYA_YOLU);

        if (filmler.length === 0) {
            return message.reply('📂 Film havuzu zaten boş, silinecek bir şey yok.');
        }

        const silinecekArg = args.join(' ').trim();

        // Eğer sadece !sil yazıldıysa, önce listeyi dök ve nasıl sileceğini söyle
        if (!silinecekArg) {
            const listeStr = filmler.map((f, i) => `${i + 1}. ${f}`).join('\n');
            return message.reply(`⚠️ Hangi filmi silmek istiyorsun?\nSilmek istediğin filmin numarasını yaz. Örnek: ` + '`!sil 1`\n\n' + `📋 **Mevcut Liste:**\n${listeStr}`);
        }

        // Sıra numarasına göre silme kontrolü
        if (!isNaN(silinecekArg)) {
            const siraNo = parseInt(silinecekArg, 10);
            if (siraNo < 1 || siraNo > filmler.length) {
                return message.reply(`❌ Geçersiz sıra numarası! Listede 1 ile ${filmler.length} arasında film var.`);
            }
            const silinenFilm = filmler.splice(siraNo - 1, 1)[0];
            dosyaYaz(DOSYA_YOLU, filmler);
            return message.reply(`🗑️ **${siraNo}. sıradaki** **"${silinenFilm}"** aktif havuzdan kaldırıldı.`);
        }

        // Metin girildiyse ada göre sil (eski destek)
        const index = filmler.findIndex(f => f.toLowerCase() === silinecekArg.toLowerCase());
        if (index === -1) {
            return message.reply(`❌ "${silinecekArg}" adında bir film bulunamadı. Doğrudan numara yazarak silebilirsin (Örnek: \`!sil 1\`).`);
        }

        filmler.splice(index, 1);
        dosyaYaz(DOSYA_YOLU, filmler);
        return message.reply(`🗑️ "${silinecekArg}" aktif havuzdan kaldırıldı.`);
    }
});

client.login(TOKEN);