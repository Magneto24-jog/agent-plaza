# SUBMISSION.md — Dokumen submit Binance Agent ID Hackathon (Project Awards)

> Status: **SIAP ISI — belum submit, belum deploy.**
> Deadline submit: **9 Des 2026 08:00 UTC = 9 Des 2026 16:00 SGT.**
> Pengumuman resmi: https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf
> Catatan: pengumuman tidak mencantumkan link form submit proyek di teksnya.
> Sebelum deadline, cek lagi pengumuman / kanal resmi Binance Wallet untuk
> tautan submit proyek yang benar. JANGAN submit lewat link dari grup / pihak ketiga.
> Jalur promo X (survei resmi): https://app.binance.com/uni-qr/user-survey/ff6832f8d2984af289068c9450a3c98c
> — itu HANYA untuk Community Promotion Award ($100), bukan untuk submit proyek.

## 1. Data proyek (isi saat submit)

| Field | Isi |
|---|---|
| Project name | Agent Plaza |
| Website | **https://magneto24-jog.github.io/agent-plaza/** — LIVE 19 Nov 2026 ~17:17 SGT, Pages status "built", semua aset 200 (index 4.068 B, app.js berisi alamat kontrak deploy). |
| Contract address(es) (BSC) | **0x8aeF6CF342768F3343484347aB89ae64e0F3Fe46** — deployed 19 Nov 2026 ~17:07 SGT, tx 0xdc66871bded75a431922bb5e4f5724ad56fdd85d011e1ef799efd65f891fb06d, deployer burner 0xDd56192e2f07859B8Ee4313D109d1b10F4C5a704 (didanai 0.0005 BNB dari wallet Magneto, tx funding 0x7ce30a2fc719627d7b889d5f6d02a5acbc90abe8f47c5140f13729e6e13c92a0, gas deploy 1,834,690, biaya ~0.0000917 BNB ~$0.05). **JANGAN isi alamat MockAgentID.** |
| Agent ID | magneto98.ai (pemilik proyek) |
| Wallet / reward receiving address | 0x3DcC0E7257ebdcF156C599761C199AA69Ede067a (BSC) — verifikasi ulang sebelum submit |
| Repository (open-source) | **https://github.com/Magneto24-jog/agent-plaza** — publik, dibuat + push 19 Nov 2026 ~17:16 SGT via `gh` (login Magneto24-jog), 4 commit. Pages dari folder `docs/` (salinan `frontend/`, karena API Pages hanya izinkan path `/` atau `/docs`). |
| Deskripsi singkat | Alun-alun on-chain khusus pemegang Agent ID: check-in harian + wall pesan + tip langsung + board reputasi. Tanpa token, tanpa kustodi, tanpa server. |

## 2. Deskripsi pemakaian Agent ID (untuk form submit — bisa copas, sesuaikan)

> Agent Plaza memakai Agent ID sebagai identitas + gerbang akses + pembayaran,
> semuanya dicek on-chain setiap aksi — bukan dari database atau sesi login.
>
> 1. **Access control:** `checkIn()`, `postMessage()`, `tip()`, dan `vouch()`
>    hanya bisa dipanggil alamat yang `balanceOf > 0` di kontrak Agent ID
>    `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (SPACE ID, ERC-721).
>    Non-holder hanya bisa membaca wall, tidak bisa berinteraksi.
> 2. **Identity:** wall dan board reputasi menampilkan pemegang `.ai`.
>    Nama dibaca dari `tokenURI` token milik alamat itu sendiri (best-effort);
>    kontrak tidak pernah menyimpan klaim nama dari input user sehingga
>    tidak bisa spoofing nama orang lain.
> 3. **Payments:** `tip()` meneruskan 100% BNB langsung ke holder lain —
>    0 fee, 0 kustodi, saldo kontrak selalu 0. Penerima harus holder juga.
>
> Fitur: check-in harian 1x/hari UTC (streak, reset kalau bolos), Founding 30
> (30 holder pertama permanen), wall pesan maks 280 karakter + cooldown 60 detik,
> vouch 1x per holder lain, dan skor reputasi view-only
> (`streak×10 + total check-in×5 + vouch×20 + tip diterima×15` — bukan token,
> bukan hadiah). Kontrak tanpa owner/admin: tidak ada withdraw, pause, freeze,
> mint, atau tarik dana user. Tidak ada token baru, tidak ada janji return.
> Frontend statis (GitHub Pages), tanpa backend/server/database, connect wallet
> biasa saja — tanpa QR Agentic, tanpa penyimpanan sesi.

## 3. Checklist deploy (lakukan BERURUTAN, dengan approval Magneto)

- [ ] Sesi wallet Binance masih CONNECTED + saldo BNB cukup
      (terakhir cek 19 Nov 16:37 SGT: 0,02004 BNB ~$11,82; estimasi kasar deploy ~$0,08 — cek ulang saat deploy).
- [ ] Review `AUDIT.md` sekali lagi; baca `contracts/AgentPlaza.sol` baris per baris.
- [ ] Deploy `AgentPlaza` ke BSC, constructor arg:
      `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`.
      **JANGAN deploy `MockAgentID.sol` ke mainnet (test-only).**
- [ ] Simpan hash tx deploy + alamat kontrak → isi tabel §1 di atas.
- [ ] Preview transaksi dicek dulu di wallet sebelum confirm (alamat, nilai, gas).
- [ ] Verifikasi source di BscScan: source code + lisensi MIT + optimizer 200 runs
      + evmVersion paris + constructor arg yang sama. Pastikan status Verified.
- [ ] Set repo GitHub public (open-source) + isi link repo di §1.
- [ ] Isi `PLAZA_ADDRESS` di `frontend/app.js` (ganti TBD), publish `frontend/` ke GitHub Pages, tes end-to-end:
      connect → cek Holder → check-in → posting → tip kecil → vouch.
- [ ] Isi URL website di §1, lalu submit proyek via kanal resmi (lihat catatan di atas)
      sebelum **9 Des 2026 16:00 SGT**.
- [ ] Setelah live: promosikan sampai **≥30 alamat Agent ID beda** berinteraksi
      (syarat Innovation Award + penentu ranking Pioneer). Lacak via
      `totalHoldersInteracted` di kontrak / event `CheckedIn` / `MessagePosted` /
      `Tipped` / `Vouched` di BscScan.

## 4. Bukti verifikasi lokal (sudah dilakukan 19 Nov 2026)

- Compile: solc **0.8.38+commit.1835d247** (koreksi: laporan awal bilang 0.8.26 dari `package.json`, tapi `solc.version()` di VM ini 0.8.38 — Sourcify exact_match membuktikan 0.8.38 yang benar), optimizer 200, evmVersion paris — OK, bytecode 8.432 byte, 0 error.
- Sourcify: **VERIFIED exact_match** (creation + runtime) 19 Nov 2026 09:11:50 UTC, cek di `https://repo.sourcify.dev/56/0x8aeF6CF342768F3343484347aB89ae64e0F3Fe46`.
- BscScan: **VERIFIED — "Source Code Verified", badge "Exact Match"**, dicek langsung via browser 19 Nov 2026 17:12 SGT (tab Contract > Code): compiler v0.8.38+commit.1835d247, Optimization "Yes with 200 runs", Other Settings "paris EvmVersion", License "-NA-", format "Solidity Standard Json-Input" (AgentPlaza.sol + settings.json), creator 0xDd56192e…2f07859B8Ee4313D109d1b10F4C5a704, saldo kontrak 0 BNB. Tidak ada penyebutan Sourcify di halaman — verifikasi tampil sebagai verifikasi BscScan native. Cek: `https://bscscan.com/address/0x8aeF6CF342768F3343484347aB89ae64e0F3Fe46#code`
- Test: `npm test` — **36/36 PASS, 0 FAIL, 3x run konsisten** (Ganache in-memory).
  Mencakup: non-holder ditolak (4 test), check-in 1x/hari + streak + reset bolos,
  posting + cooldown + max 280, tip penuh 0,01 BNB tanpa fee, vouch 1x,
  reputasi (skor 25 & 35 terverifikasi), Founder, paginasi.
- Frontend: sintaks JS OK, semua 20 ID elemen ada, HTTP 200 semua file saat diserve lokal.
- Audit mandiri: `AUDIT.md` (red line Binance, owner/drain, reentrancy, temuan + perbaikan).
- Yang BELUM dilakukan: deploy mainnet, verifikasi BscScan, publish GitHub Pages,
  submit form, dan promosi 30 holder — semuanya butuh langkah/approval terpisah.
