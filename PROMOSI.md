# Promosi Agent Plaza + Panduan Tes

Siap pakai. Yang posting tetap Bang sendiri (jangan lewat bot / jangan spam).
Baseline on-chain saat dokumen ini dibuat (19 Nov 2026 ~17:21 SGT):
holder 0, founder 0, pesan 0, gas BSC 0,05 gwei, saldo wallet Bang 0,019506 BNB.

## 1. Draft postingan X (1x saja, jangan diulang-ulang)

> Agent Plaza is live 🟡
>
> A little on-chain square for Agent ID holders on BNB Chain.
> Daily check-in, message wall, direct tips between holders — no token, no owner, no custody.
>
> First 30 holders to check in become Founding Agents.
>
> Try it: https://magneto24-jog.github.io/agent-plaza/
> Contract (verified): https://bscscan.com/address/0x8aeF6CF342768F3343484347aB89ae64e0F3Fe46#code
>
> Built for the Binance Agent ID Hackathon.
> #BinanceWalletHackathon #AgenticWallet

Versi Indonesia (kalau mau posting Bahasa Indonesia):

> Agent Plaza sudah live 🟡
>
> Alun-alun on-chain khusus pemegang Agent ID di BNB Chain.
> Check-in harian, dinding pesan, tip langsung antar holder — tanpa token, tanpa owner, tanpa kustodi.
>
> 30 holder pertama yang check-in jadi Founding Agent.
>
> Coba: https://magneto24-jog.github.io/agent-plaza/
> Kontrak (terverifikasi): https://bscscan.com/address/0x8aeF6CF342768F3343484347aB89ae64e0F3Fe46#code
>
> Dibuat untuk Binance Agent ID Hackathon.
> #BinanceWalletHackathon #AgenticWallet

Aturan aman (jangan dilanggar):
- Satu postingan asli saja. Jangan repost berkali-kali, jangan pakai banyak akun, jangan minta orang spam.
- Jangan janjiin hadiah / return / "passive income" — itu langsung diskualifikasi.
- Jangan suruh orang scan QR / masukin pairing code di website mana pun.
- Jangan posting dari akun yang sama di banyak tempat dalam waktu berdekatan.

## 2. Draft pendek buat grup Telegram / WhatsApp

> Bang, yang punya Agent ID (.ai) di Binance Wallet, cobain Agent Plaza yuk — alun-alun on-chain buat holder Agent ID di BSC.
>
> Check-in harian, tulis pesan di wall, tip langsung ke holder lain (tanpa fee, tanpa kustodi). Tanpa token, tanpa owner. 30 pertama yang check-in jadi Founding Agent.
>
> https://magneto24-jog.github.io/agent-plaza/
>
> Butuh wallet yang pegang Agent ID + dikit BNB buat gas (check-in sekitar $0,007).

Kirim sekali per grup, jangan broadcast ke banyak grup sekaligus dalam 1 jam.

## 3. Panduan tes (wallet Bang sendiri)

Tujuan: Bang jadi holder #1 + founder #1, dan buktiin situsnya jalan di wallet asli.

Persiapan:
- Wallet yang dipakai harus pegang Agent ID `magneto98.ai` (alamat `0x3DcC0E7257ebdcF156C599761C199AA69Ede067a`). Itu wallet Bang yang biasa.
- Saldo 0,019506 BNB — lebih dari cukup (semua tes di bawah totalnya kurang dari $0,02).
- Buka https://magneto24-jog.github.io/agent-plaza/ di browser yang ada wallet-nya (MetaMask / Binance Wallet extension).

Langkah:
1. Klik **Connect Wallet**, pilih wallet Bang, pastikan jaringannya **BNB Smart Chain** (chain 56). Kalau masih di chain lain, situs akan minta pindah.
2. Setelah connect, cek status: harus muncul nama `magneto98.ai` (atau alamat pendek) + tulisan holder terverifikasi. Kalau muncul "bukan holder", STOP dan kabari Muse — jangan lanjut.
3. Klik **Check-in**. Konfirmasi di wallet. Biaya sekitar 0,0000126 BNB (~$0,007). Setelah sukses: streak 1, dan Bang jadi **Founder #1** (founderCount jadi 1).
4. Tulis pesan di wall (maks 280 karakter), klik **Post**. Biaya sekitar 0,0000083 BNB (~$0,005). Tunggu 60 detik sebelum posting lagi (cooldown).
5. (Opsional) **Tip** ke holder lain kalau sudah ada holder lain — isi jumlah kecil (mis. 0,0001 BNB), konfirmasi di wallet. Tip diteruskan 100%, kontrak tidak nyimpen apa-apa.
6. (Opsional) **Vouch** satu holder lain (1x per orang, tidak bisa vouch diri sendiri).

Verifikasi setelah tes:
- Di situs: streak Bang 1, founder badge muncul, pesan Bang muncul di wall.
- Di BscScan (https://bscscan.com/address/0x8aeF6CF342768F3343484347aB89ae64e0F3Fe46): totalHoldersInteracted harus 1, founderCount 1, messageCount 1. Atau minta Muse yang cek.

Kalau ada yang gagal:
- "Bukan holder" padahal wallet Bang pegang magneto98.ai → kabari Muse, jangan paksa.
- Transaksi pending lama → jangan kirim ulang; cek dulu di BscScan pakai tx hash-nya.
- Gas tiba-tiba mahal (di atas 1 gwei) → tunda dulu, gas BSC normalnya 0,05 gwei.

## 4. Target & tes 3 hari

- Target: 30 holder beda (alamat Agent ID beda) yang interaksi — syarat lolos Innovation Award.
- Tes 3 hari (mulai dari postingan pertama): kalau di hari ke-3 total holder masih di bawah 10, kita evaluasi jujur — lanjut atau berhenti, jangan dipaksa.
- Cara cek progres: minta Muse cek `totalHoldersInteracted` di kontrak, atau lihat langsung di BscScan.

## 5. Yang TIDAK dilakukan

- Tidak ada postingan otomatis / bot.
- Tidak ada beli follower, tidak ada mass-register akun.
- Tidak ada janji hadiah.
- Tidak ada pungutan / fee dari user — semua interaksi gratis kecuali gas BSC masing-masing.
