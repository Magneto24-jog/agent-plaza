// Test lokal AgentPlaza di Ganache (in-memory, tanpa mainnet, tanpa private key asli).
// Jalankan: npm test   (pastikan sudah npm run compile)
// Semua test harus PASS. Angka dicetak eksplisit agar bisa diaudit.
const fs = require("fs");
const path = require("path");
const Ganache = require("ganache");
const { ethers } = require("ethers");

const ROOT = path.join(__dirname, "..");
const plazaJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "AgentPlaza.json"), "utf8"));
const mockJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "MockAgentID.json"), "utf8"));

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail });
  if (ok) { pass++; console.log(`PASS  ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); }
}
// Harness yang benar: kirim tx dengan gasLimit eksplisit (lewati estimateGas),
// lalu cek receipt. Revert on-chain = receipt status 0 (ethers v6 wait() juga
// melempar "transaction execution reverted"). HANYA menunggu send saja tidak
// cukup: send bisa resolve (tx ter-broadcast) padahal receipt-nya status 0.
async function expectRevertTx(sendFn, name, detail = "") {
  try {
    const tx = await sendFn();
    const rc = await tx.wait();
    if (rc.status === 0) {
      check(name, true, detail + " (receipt status 0)");
    } else {
      check(name, false, detail + " (tx sukses status 1, padahal harus revert)");
    }
  } catch (e) {
    const msg = (e && e.message) || "";
    const ok = /revert|CALL_EXCEPTION|missing revert data/i.test(msg);
    check(name, ok, detail + (ok ? " (revert)" : ` (error aneh: ${msg.slice(0, 160)})`));
  }
}
async function evmIncreaseTime(provider, secs) {
  await provider.send("evm_increaseTime", [secs]);
  await provider.send("evm_mine", []);
}

async function main() {
  // Ganache sebagai server HTTP lokal (ethers Node tidak punya BrowserJsonRpcProvider).
  const server = Ganache.server({ logging: { quiet: true } });
  await server.listen(8545, "127.0.0.1");
  const ethProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const getSigner = (i) => ethProvider.getSigner(i);
  const closeServer = async () => { try { await server.close(); } catch (_) {} };
  const deployer = await getSigner(0);

  // Deploy MockAgentID + AgentPlaza
  const MockFactory = new ethers.ContractFactory(mockJson.abi, mockJson.bytecode, deployer);
  const mock = await MockFactory.deploy();
  await mock.waitForDeployment();
  const mockAddr = await mock.getAddress();
  console.log("MockAgentID:", mockAddr);

  const PlazaFactory = new ethers.ContractFactory(plazaJson.abi, plazaJson.bytecode, deployer);
  const plaza = await PlazaFactory.deploy(mockAddr);
  await plaza.waitForDeployment();
  const plazaAddr = await plaza.getAddress();
  console.log("AgentPlaza:", plazaAddr);
  console.log("Deploy gas (approx, dari receipt):");
  const deployReceipt = await ethProvider.getTransactionReceipt((await plaza.deploymentTransaction()).hash);
  console.log("  gasUsed deploy AgentPlaza:", deployReceipt.gasUsed.toString());

  const holder1 = await getSigner(1);
  const holder2 = await getSigner(2);
  const holder3 = await getSigner(3);
  const nonHolder = await getSigner(4);
  const a1 = await holder1.getAddress();
  const a2 = await holder2.getAddress();
  const a3 = await holder3.getAddress();
  const aN = await nonHolder.getAddress();

  // Mint Agent ID (mock) untuk holder1-3 saja
  for (const s of [holder1, holder2, holder3]) {
    await (await mock.connect(deployer).mint(await s.getAddress())).wait();
  }
  check("T1 holder balanceOf=1", (await mock.balanceOf(a1)) === 1n, `a1=${a1.slice(0, 10)}...`);
  check("T2 non-holder balanceOf=0", (await mock.balanceOf(aN)) === 0n);
  check("T3 isHolder(holder)=true", await plaza.isHolder(a1));
  check("T4 isHolder(non-holder)=false", (await plaza.isHolder(aN)) === false);

  // --- Non-holder ditolak ---
  await expectRevertTx(() => plaza.connect(nonHolder).checkIn({ gasLimit: 300000 }), "T5 non-holder checkIn ditolak");
  await expectRevertTx(() => plaza.connect(nonHolder).postMessage("halo", { gasLimit: 300000 }), "T6 non-holder postMessage ditolak");
  await expectRevertTx(() => plaza.connect(nonHolder).tip(a1, { value: 100n, gasLimit: 300000 }), "T7 non-holder tip ditolak");
  await expectRevertTx(() => plaza.connect(nonHolder).vouch(a1, { gasLimit: 300000 }), "T8 non-holder vouch ditolak");

  // --- Holder check-in hari 1 ---
  await (await plaza.connect(holder1).checkIn()).wait();
  let rep1 = await plaza.getReputation(a1);
  check("T9 holder checkIn streak=1", rep1.streak === 1n && rep1.total === 1n, `streak=${rep1.streak} total=${rep1.total}`);
  check("T10 holder pertama = Founder", await plaza.isFounder(a1), `founderCount=${await plaza.founderCount()}`);
  check("T11 totalHoldersInteracted=1", (await plaza.totalHoldersInteracted()) === 1n);
  await expectRevertTx(() => plaza.connect(holder1).checkIn({ gasLimit: 300000 }), "T12 checkIn ke-2 di hari sama ditolak");

  // --- Post message + cooldown + panjang ---
  await (await plaza.connect(holder1).postMessage("Halo Plaza! Saya holder pertama.")).wait();
  check("T13 messageCount=1", (await plaza.messageCount()) === 1n);
  const msgs = await plaza.getMessages(0, 10);
  check("T14 isi pesan tersimpan benar", msgs[0].poster.toLowerCase() === a1.toLowerCase() && msgs[0].text === "Halo Plaza! Saya holder pertama.");
  await expectRevertTx(() => plaza.connect(holder1).postMessage("terlalu cepat", { gasLimit: 300000 }), "T15 post ke-2 dalam 60 detik ditolak (cooldown)");
  await expectRevertTx(() => plaza.connect(holder1).postMessage("x".repeat(281), { gasLimit: 300000 }), "T16 pesan 281 char ditolak (max 280)");
  // Lewati 61 detik, post lagi harus bisa
  await evmIncreaseTime(ethProvider, 61);
  await (await plaza.connect(holder1).postMessage("Pesan kedua setelah cooldown.")).wait();
  check("T17 post setelah 61 detik berhasil", (await plaza.messageCount()) === 2n);

  // --- Tip: diteruskan penuh, tanpa fee ---
  const tipWei = ethers.parseEther("0.01");
  const balBefore = await ethProvider.getBalance(a2);
  await (await plaza.connect(holder1).tip(a2, { value: tipWei })).wait();
  const balAfter = await ethProvider.getBalance(a2);
  check("T18 tip diteruskan penuh 0.01 BNB", balAfter - balBefore === tipWei, `diterima=${ethers.formatEther(balAfter - balBefore)} BNB`);
  const rep2 = await plaza.getReputation(a2);
  check("T19 tipsReceived tercatat 0.01 BNB", rep2.tipsWei === tipWei && rep2.tipsCount === 1n);
  await expectRevertTx(() => plaza.connect(holder1).tip(a1, { value: tipWei, gasLimit: 300000 }), "T20 tip ke diri sendiri ditolak");
  await expectRevertTx(() => plaza.connect(holder1).tip(aN, { value: tipWei, gasLimit: 300000 }), "T21 tip ke non-holder ditolak");
  await expectRevertTx(() => plaza.connect(holder1).tip(a2, { value: 0n, gasLimit: 300000 }), "T22 tip 0 ditolak");

  // --- Vouch ---
  await (await plaza.connect(holder1).vouch(a2)).wait();
  check("T23 vouch diterima, vouches=1", (await plaza.getReputation(a2)).vouches === 1n);
  await expectRevertTx(() => plaza.connect(holder1).vouch(a2, { gasLimit: 300000 }), "T24 vouch ke-2 ke target sama ditolak");
  await expectRevertTx(() => plaza.connect(holder1).vouch(a1, { gasLimit: 300000 }), "T25 vouch diri sendiri ditolak");
  await expectRevertTx(() => plaza.connect(holder1).vouch(aN, { gasLimit: 300000 }), "T26 vouch ke non-holder ditolak");

  // --- Streak hari ke-2 (naik), lalu bolos 1 hari (reset) ---
  await evmIncreaseTime(ethProvider, 86400); // +1 hari
  await (await plaza.connect(holder1).checkIn()).wait();
  rep1 = await plaza.getReputation(a1);
  check("T27 checkIn hari ke-2 streak=2", rep1.streak === 2n, `streak=${rep1.streak}`);
  await evmIncreaseTime(ethProvider, 2 * 86400); // bolos 1 hari penuh (loncat 2 hari)
  await (await plaza.connect(holder1).checkIn()).wait();
  rep1 = await plaza.getReputation(a1);
  check("T28 bolos 1 hari -> streak reset ke 1", rep1.streak === 1n, `streak=${rep1.streak} total=${rep1.total} longest=${rep1.longest}`);
  check("T29 longestStreak tetap 2", rep1.longest === 2n);

  // --- Reputasi: rumus streak*10 + total*5 + vouch*20 + tipCount*15 ---
  // holder1: streak 1, total 3, vouch 0, tipCount 0 => 1*10+3*5=25
  check("T30 skor reputasi holder1 = 25", rep1.score === 25n, `score=${rep1.score}`);
  // holder2: streak 0, total 0, vouch 1, tipCount 1 => 0+0+20+15=35
  const rep2b = await plaza.getReputation(a2);
  check("T31 skor reputasi holder2 = 35", rep2b.score === 35n, `score=${rep2b.score}`);

  // --- Founding 30: buat 30 holder baru, yang ke-31 bukan founder ---
  // Ganache default punya 10 akun (0-9). Akun 0 deployer, 1-3 sudah dipakai, 4 non-holder.
  // Mint untuk akun 5-9 (5 holder baru) + holder2, holder3 sudah founder? holder2/3 belum check-in, jadi check-in mereka.
  await (await plaza.connect(holder2).checkIn()).wait();
  await (await plaza.connect(holder3).checkIn()).wait();
  check("T32 holder2 & holder3 jadi Founder (kuota masih ada)", (await plaza.isFounder(a2)) && (await plaza.isFounder(a3)));
  check("T33 founderCount=3", (await plaza.founderCount()) === 3n);
  // totalHoldersInteracted sekarang: holder1, holder2, holder3 = 3 (tip/vouch tidak menambah penerima)
  check("T34 totalHoldersInteracted=3", (await plaza.totalHoldersInteracted()) === 3n);
  const interactors = await plaza.getInteractors(0, 50);
  check("T35 getInteractors mengembalikan 3 alamat", interactors.length === 3);

  // --- getMessages paginasi di luar range ---
  const empty = await plaza.getMessages(99, 10);
  check("T36 getMessages offset di luar range = array kosong", empty.length === 0);

  console.log(`\nHASIL: ${pass} PASS, ${fail} FAIL dari ${pass + fail} test`);
  console.log(`Alamat kontrak test: ${plazaAddr}`);
  await closeServer();
  if (fail > 0) process.exit(1);
}

main().catch(async (e) => { console.error("TEST ERROR:", e); process.exit(1); });
