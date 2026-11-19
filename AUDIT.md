# AUDIT.md — Audit mandiri Agent Plaza (self-audit, bukan audit pihak ketiga)

Tanggal: 19 Nov 2026. Status: **MVP lolos 36/36 test lokal. BELUM deploy.**
Auditor: Muse (self-audit). Kontrak: `contracts/AgentPlaza.sol`
(compiler solc 0.8.26, optimizer 200 runs, evmVersion **paris**, bytecode 8.432 byte).
Test: `npm test` — Ganache in-memory, 36 test, dijalankan 3x, hasil **36 PASS, 0 FAIL**
setiap kali. Detail hasil test ada di output `npm test` (T1–T36).

> Audit ini TIDAK menggantikan audit profesional. Sebelum deploy mainnet,
> baca ulang kontrak baris per baris dan cek preview transaksi di wallet.

## 1. Cek red line Binance (pelanggaran = diskualifikasi)

| Red line | Hasil |
|---|---|
| Login QR web Agentic Wallet | ✅ AMAN — frontend hanya `window.ethereum` injected biasa. Tidak ada QR, pairing code, atau penyimpanan sesi. Tidak ada server sama sekali. |
| Bypass konfirmasi user | ✅ AMAN — semua tx (`checkIn`, `postMessage`, `tip`, `vouch`) adalah tx biasa yang harus di-confirm user di wallet. Tidak ada auto-sign / Secure Auto Sign. |
| Transfer otomatis / scheduled collection / bundled extra transfer / unlimited approval | ✅ AMAN — tidak ada satu pun. `tip()` hanya jalan saat user sendiri memanggilnya, hanya 1 transfer, tepat `msg.value`, ke alamat yang user isi. Tidak ada `approve` / `allowance` di mana pun. |
| Kontrak open-source + owner permission jelas | ✅ AMAN — MIT, source akan diverifikasi di BscScan. **Tidak ada owner sama sekali**: tidak ada `owner`, `onlyOwner`, `pause`, `freeze`, `mint`, `withdraw`, `setTax`, `selfdestruct`, `delegatecall`, `upgrade`. Lihat §2. |
| Impersonasi Binance / BNB | ✅ AMAN — nama proyek "Agent Plaza", tidak ada token. Kata "Binance"/"BNB" di frontend hanya di kalimat "Bukan produk Binance" dan penyebutan mata uang gas (BNB) / nama jaringan (BNB Smart Chain) — faktual, bukan nama proyek/token/domain. |
| Kumpul seed / private key / API secret / pairing code | ✅ AMAN — tidak ada input seperti itu di kontrak maupun frontend. |
| Janji return ("passive income" dst) | ✅ AMAN — tidak ada token, tidak ada mint, tidak ada janji hadiah. Kata "passive income" hanya muncul di kalimat "tidak ada passive income" (disclaimer). |
| Risk warning untuk trading | ✅ N/A — tidak ada fitur trading. Tidak ditambahkan. |
| Agent ID sebagai tool lookup wallet orang (doxxing) | ✅ AMAN — nama `.ai` hanya dibaca dari `tokenURI` token milik alamat itu sendiri (best-effort, fallback alamat singkat). Kontrak tidak menyimpan klaim nama dari input user. Wall hanya menampilkan poster yang posting sendiri. |

## 2. Cek owner / drain / kontrol

- `grep` kontrak: tidak ada `owner`, `onlyOwner`, `withdraw`, `pause`, `unpause`,
  `freeze`, `mint`, `burn`, `setFee`, `setTax`, `selfdestruct`, `delegatecall`,
  `callcode`, `upgradeTo`, `transferOwnership`, `renounceOwnership`.
- Satu-satunya `call` adalah di `tip()`: `recipient.call{value: msg.value}("")`
  ke alamat penerima yang dipilih user, dengan nilai tepat `msg.value`.
- Saldo kontrak: selalu 0 setelah tip sukses (semua BNB diteruskan). Tidak ada
  fungsi yang bisa menarik saldo kontrak karena tidak ada yang bisa masuk
  selain via `tip()` yang langsung diteruskan.
- Parameter (max pesan 280, cooldown 60 dtk, Founding 30) adalah `constant` —
  tidak bisa diubah siapa pun, termasuk deployer. Konsekuensi: kalau ada bug,
  perbaikannya adalah deploy kontrak baru + submit alamat baru (masih sempat
  sebelum 9 Des 16:00 SGT), bukan patch diam-diam.

## 3. Cek keamanan teknis

| Cek | Hasil |
|---|---|
| Reentrancy di `tip()` | ✅ State (`tipsReceived`, `tipsReceivedCount`, `_markInteracted`) di-update SEBELUM external call (checks-effects-interactions) + guard `nonReentrant` (mutex `_locked`). Test T18: tip 0,01 BNB diteruskan penuh, saldo penerima +0,01 persis. |
| Akses `onlyHolder` | ✅ Semua fungsi state-changing memakai `onlyHolder` (`balanceOf > 0` di Agent ID). Test T5–T8: non-holder ditolak di semua fungsi. Test T21/T26: tip/vouch ke non-holder ditolak. |
| Check-in ganda / streak | ✅ `lastCheckInDay` per hari UTC (`block.timestamp / 1 days`). Test T12: check-in ke-2 di hari sama ditolak. T27: hari ke-2 streak 2. T28: bolos 1 hari → streak reset 1, `longestStreak` tetap 2. |
| Spam wall | ✅ Max 280 byte (T16: 281 char ditolak), cooldown 60 detik (T15 ditolak, T17 setelah 61 detik berhasil). |
| Vouch ganda / self | ✅ `hasVouched` mapping + `target != msg.sender`. Test T23–T26: vouch ok 1x, duplikat/self/non-holder ditolak. |
| Founder 30 | ✅ `founderCount < FOUNDING_LIMIT`, flag permanen. Test T10/T32–T33: holder 1–3 jadi Founder, count 3. Batas 30 belum teruji sampai 30 (hanya 3 holder di test) — logika sama, `founderCount` naik 1 per founder baru. |
| Reputasi | ✅ Rumus view-only `streak×10 + total×5 + vouch×20 + tipCount×15`. Test T30: 25 (holder1), T31: 35 (holder2). Founder tidak menambah skor. |
| `getMessages`/`getInteractors` paginasi | ✅ Limit 1–50, offset di luar range = array kosong (T36). |
| Integer / overflow | ✅ Solidity 0.8.x checked arithmetic default. Tidak ada perkalian/divisi berisiko (skor hanya penjumlahan/perkalian kecil). |
| `block.timestamp` | ⚠️ Dipakai hanya untuk hari UTC + cooldown 60 dtk. Manipulasi timestamp oleh validator (±detik) tidak material untuk fitur ini. |

## 4. Temuan saat build & test (sudah diperbaiki)

1. **(KRITIS, diperbaiki) `evmVersion` default Cancun → `invalid opcode`.**
   Compile pertama (solc 0.8.26, default Cancun) lolos compile, tapi
   `messages(0)` dan `getMessages()` gagal `invalid opcode` di Ganache.
   Penyebab: solc Cancun meng-emit `MCOPY` untuk copy struct berisi `string`,
   opcode yang tidak dijamin di BSC / Ganache default. Perbaikan: compile
   dengan `evmVersion: "paris"` di `scripts/compile.js`. Setelah itu semua
   view berfungsi (debug-view: 6/6 OK). Pelajaran: JANGAN deploy bytecode
   Cancun ke BSC tanpa cek ini.
2. **(HARNESS, diperbaiki — bukan bug kontrak) Test T24 flaky.**
   `expectRevert` lama hanya menunggu promise send — padahal di ethers v6
   send bisa resolve (tx ter-broadcast) sementara revert baru terlihat di
   receipt (status 0). Debug membuktikan kontrak benar: estimateGas duplikat
   revert + tx duplikat receipt status 0. Perbaikan: `expectRevertTx` kirim
   dengan `gasLimit` eksplisit lalu cek `receipt.status`. Setelah perbaikan:
   36/36 PASS, 3x run konsisten.
3. **(MINOR) Ganache µWS tidak cocok dengan Node 24** — fallback ke
   implementasi NodeJS, hanya warning performa, test tetap jalan.
   Bukan masalah kontrak.

## 5. Risiko sisa (jujur)

1. **Distribusi, bukan kode.** Syarat Innovation: ≥30 alamat Agent ID beda
   interaksi. Test lokal hanya 3 holder. Kalau promosi gagal, proyek tidak
   lolos meski kode sempurna.
2. **Kompetitor.** AgentWall (check-in+wall+tip) sudah launch 19 Nov.
   Pembeda kita (reputasi + Founding 30) tipis — nilai inovasi tergantung
   eksekusi + traction, bukan klaim.
3. **Nama `.ai` di frontend best-effort.** `tokenOfOwnerByIndex`/`tokenURI`
   mungkin tidak didukung kontrak Agent ID — fallback-nya alamat singkat.
   Ini tidak memengaruhi kontrak, hanya tampilan.
4. **Tidak ada audit pihak ketiga.** Self-audit ini + 36 test adalah
   verifikasi yang ada. Jangan klaim "sudah diaudit profesional" di submission.
5. **Immutability.** Tanpa owner = tanpa jalan perbaikan. Kalau ditemukan bug
   setelah deploy, harus deploy ulang + update alamat di frontend + submission
   (masih bisa sebelum deadline 9 Des 16:00 SGT).
6. **Gas mainnet ≠ Ganache.** Angka gas di bawah ini estimasi kasar dari
   Ganache + gas BSC saat cek (0,074 gwei, BNB $589,58, 19 Nov 16:37 SGT).
   Harga gas + harga BNB bergerak. Cek preview sebelum confirm.

## 6. Angka gas (Ganache, untuk estimasi kasar)

| Aksi | Gas |
|---|---|
| Deploy AgentPlaza | 1.834.666 |
| checkIn pertama (jadi Founder) | 251.772 |
| checkIn hari ke-2 | 54.307 |
| postMessage pendek | 166.498 |
| tip 0,01 BNB | 90.600 |
| vouch | 79.237 |

Estimasi kasar deploy di BSC: 1.834.666 × 0,074 gwei ≈ **0,000136 BNB ≈ $0,08**
(BUKAN janji — lihat §5.6). Saldo wallet Magneto 0,02004 BNB (~$11,82) ≈ 148x itu.
