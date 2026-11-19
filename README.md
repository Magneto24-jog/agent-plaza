# Agent Plaza

Alun-alun on-chain khusus pemegang **Agent ID** — untuk **Binance Agent ID Hackathon, Project Awards**.

> Bukan produk Binance. Tidak ada token baru, tidak ada hadiah yang dijanjikan,
> tidak ada passive income. Proyek ini tidak berafiliasi dengan Binance.

## Apa itu

Pemegang Agent ID (`.ai`, kontrak `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` di BSC)
punya satu tempat untuk membuktikan mereka aktif dan saling mengenal:

1. **Check-in harian** — hanya holder, 1x/hari UTC. Streak naik kalau tiap hari,
   reset kalau bolos 1 hari. 30 holder pertama jadi **Founding 30** permanen.
2. **Wall pesan** — hanya holder bisa posting (maks 280 karakter, jeda 60 detik).
   Yang tampil nama `.ai` (dibaca dari token, best-effort) + alamat singkat.
3. **Tip** — kirim BNB langsung ke holder lain. 100% diteruskan, 0 fee, 0 kustodi.
4. **Reputasi** — skor view-only: `streak×10 + total check-in×5 + vouch×20 + jumlah tip diterima×15`.
   Skor BUKAN token dan BUKAN hadiah. **Vouch** 1x per holder lain.

Pembeda vs pesaing (mis. AgentWall yang juga check-in+wall+tip): lapisan
**reputasi + Founding 30**. Agent ID dipakai di 3 sisi sekaligus: access control,
identity, payments.

## Pemakaian Agent ID (untuk juri)

| Dimensi | Cara dipakai |
|---|---|
| Access control (30% depth) | `onlyHolder` di `checkIn`, `postMessage`, `tip`, `vouch` — cek `balanceOf > 0` di kontrak Agent ID setiap kali, bukan dari database / sesi. |
| Identity | Wall + board menampilkan pemegang `.ai`; nama dibaca dari `tokenURI` token-nya sendiri (best-effort, fallback alamat singkat). Kontrak tidak pernah menyimpan klaim nama dari input user — anti-spoofing. |
| Payments | `tip()` meneruskan 100% BNB ke holder lain, tanpa fee dan tanpa ditahan. |

## Struktur

```
contracts/
  AgentPlaza.sol   # kontrak utama (tanpa owner, tanpa token, tanpa admin)
  MockAgentID.sol  # HANYA test lokal — JANGAN deploy ke mainnet
frontend/
  index.html       # statis, GitHub Pages-ready
  app.js           # vanilla JS + ethers v6 (CDN)
  abi.js           # digenerate dari build/AgentPlaza.json
  styles.css
test/test.js       # 36 test di Ganache (in-memory)
scripts/
  compile.js       # solc-js, evmVersion paris (lihat bawah)
  gas-report.js    # ukur gas tiap fungsi
  debug-view.js / debug-vouch.js / debug-vouch2.js  # alat debug, bukan bagian produk
build/             # hasil compile (abi + bytecode) — digenerate
```

## Keamanan — baca dulu sebelum deploy

- **Tanpa owner / tanpa admin.** Semua parameter adalah konstanta. Tidak ada
  `withdraw`, `pause`, `freeze`, `mint`, ubah tax, atau tarik dana user.
  Kalau ada bug, solusinya deploy kontrak baru.
- **Tanpa kustodi.** `tip()` meneruskan `msg.value` 100% ke penerima dengan
  checks-effects-interactions + nonReentrant guard. Kontrak tidak pernah
  menyimpan BNB (saldo kontrak selalu 0 setelah tiap tip sukses).
- **Tanpa login QR Agentic.** Frontend hanya connect wallet biasa (injected).
  Tidak ada QR, pairing code, atau penyimpanan sesi di server — memang tidak
  ada server sama sekali.
- **Tanpa janji return.** Tidak ada token, tidak ada mint, tidak ada
  "passive income" / "automatic money-making" di mana pun.
- **Nama proyek** "Agent Plaza" — tidak memakai "Binance" / "BNB" sebagai
  nama proyek, token, atau domain.
- Audit mandiri lengkap: lihat `AUDIT.md`.

## Kenapa `evmVersion: "paris"` (penting)

solc ≥0.8.24 default-nya Cancun dan bisa meng-emit opcode `MCOPY`. Waktu
compile default, `getMessages` / getter `messages(0)` gagal `invalid opcode`
di Ganache. BSC tidak menjamin opcode Cancun — jadi compile memakai
`evmVersion: "paris"` (aman untuk BSC, kontrak ini tidak butuh fitur Cancun).
Temuan ini didokumentasikan di `AUDIT.md`.

## Cara build & test (lokal, tanpa mainnet)

```bash
cd agent-plaza
npm install
npm run compile   # -> build/AgentPlaza.json (bytecode 8.432 byte)
npm test          # 36 test di Ganache, harus 36 PASS 0 FAIL
node scripts/gas-report.js   # ukur gas tiap fungsi
```

## Deploy (HANYA dengan approval Magneto + preview — BELUM dilakukan)

1. Review `AUDIT.md` sekali lagi. Pastikan deployer = wallet Magneto
   (`0x3DcC0E7257ebdcF156C599761C199AA69Ede067a`) dan sesi Binance masih CONNECTED.
2. Deploy `AgentPlaza` ke BSC dengan constructor `agentIdAddress =
   0x60b9262456de011f7d15a54cdd8c48baaa8b022f`. **JANGAN deploy `MockAgentID`.**
3. Estimasi kasar (BUKAN janji, diukur di Ganache + gas BSC 0,074 gwei,
   BNB $589,58 — harga bergerak): deploy ±1.834.666 gas ≈ **0,000136 BNB ≈ $0,08**.
   Saldo wallet 0,02004 BNB (~$11,82) ≈ 148x estimasi deploy.
   Biaya final baru ketahuan saat preview transaksi — cek preview dulu sebelum confirm.
4. Verifikasi source di BscScan (source code + MIT + optimizer 200 runs +
   evmVersion paris + constructor arg), lalu set kode public / open-source.
5. Isi `PLAZA_ADDRESS` di `frontend/app.js`, publish `frontend/` ke GitHub Pages,
   isi `SUBMISSION.md` (alamat kontrak + URL website), lalu submit sebelum
   **9 Des 2026 16:00 SGT**.
6. Setelah live: promosikan ke holder Agent ID lain sampai **≥30 alamat beda**
   berinteraksi — itu syarat Innovation Award dan penentu ranking Pioneer.

## Lisensi

MIT — lihat `LICENSE`.
