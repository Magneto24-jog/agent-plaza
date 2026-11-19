/* Agent Plaza — frontend statis. Tanpa backend, tanpa server, tanpa localStorage sesi.
   Semua state hanya di memori halaman. Refresh = state hilang, itu disengaja. */
const AGENT_ID_ADDRESS = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";
// ISI SETELAH DEPLOY (lihat SUBMISSION.md). Selama masih TBD, tombol aksi nonaktif.
const PLAZA_ADDRESS = "0x8aeF6CF342768F3343484347aB89ae64e0F3Fe46"; // Deployed 19 Nov 2026, tx 0xdc66871bded75a431922bb5e4f5724ad56fdd85d011e1ef799efd65f891fb06d
const BSC_CHAIN_ID = 56;
const AGENT_ID_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
];

let provider = null, signer = null, account = null;
let plaza = null, agentId = null;
const nameCache = {}; // memori saja, bukan penyimpanan permanen

const $ = (id) => document.getElementById(id);
const short = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "—");
function setMsg(id, t, ok = true) { const el = $(id); el.textContent = t; el.style.color = ok ? "green" : "red"; }

// Best-effort: baca nama .ai dari tokenURI (kalau kontrak Agent ID dukung enumerable).
// Kalau gagal, tampilkan alamat singkat saja. TIDAK PERNAH menebak nama dari input user.
async function resolveAiName(addr) {
  if (nameCache[addr]) return nameCache[addr];
  try {
    const tokenId = await agentId.tokenOfOwnerByIndex(addr, 0);
    let uri = await agentId.tokenURI(tokenId);
    if (uri.startsWith("ipfs://")) uri = "https://ipfs.io/ipfs/" + uri.slice(7);
    const res = await fetch(uri);
    const meta = await res.json();
    const name = meta && meta.name ? String(meta.name) : null;
    if (name) { nameCache[addr] = name; return name; }
  } catch (_) { /* bukan enumerable / tokenURI tidak bisa dibaca — fallback alamat */ }
  return null;
}

async function refreshHolder() {
  if (!account || !agentId) return;
  const bal = await agentId.balanceOf(account);
  const isHolder = bal > 0n;
  $("holder-status").textContent = "Status Agent ID: " + (isHolder ? "✅ HOLDER" : "❌ BUKAN HOLDER — kamu hanya bisa melihat");
  const name = isHolder ? await resolveAiName(account) : null;
  $("ai-name").textContent = "Nama .ai: " + (name || (isHolder ? short(account) + " (nama tidak terbaca dari token, tampil alamat)" : "—"));
  const enabled = isHolder && plaza !== null;
  for (const id of ["btn-checkin", "btn-post", "btn-tip", "btn-vouch"]) $(id).disabled = !enabled;
  $("post-text").disabled = !enabled;
  if (plaza) {
    const rep = await plaza.getReputation(account);
    $("my-streak").textContent = `Streak saya: ${rep.streak} hari (terpanjang ${rep.longest}, total ${rep.total} check-in, skor ${rep.score}${rep.founder ? ", 👑 FOUNDER" : ""})`;
    $("founder-progress").textContent = `Founding: ${await plaza.founderCount()} / 30`;
  }
}

async function connect() {
  if (!window.ethereum) { alert("Tidak ada wallet terdeteksi. Pasang MetaMask / Binance Wallet dulu."); return; }
  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  account = await signer.getAddress();
  const net = await provider.getNetwork();
  $("network").textContent = "Jaringan: chainId " + net.chainId + (Number(net.chainId) === BSC_CHAIN_ID ? " (BSC ✅)" : " (BUKAN BSC — pindah ke BSC dulu)");
  if (Number(net.chainId) !== BSC_CHAIN_ID) {
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] });
    } catch (e) { alert("Pindah ke BNB Smart Chain (chainId 56) dulu di wallet kamu."); return; }
  }
  $("account").textContent = "Alamat: " + account;
  agentId = new ethers.Contract(AGENT_ID_ADDRESS, AGENT_ID_ABI, provider);
  if (PLAZA_ADDRESS !== "0x0000000000000000000000000000000000000000") {
    plaza = new ethers.Contract(PLAZA_ADDRESS, AGENT_PLAZA_ABI, signer);
    $("contract-addr").textContent = PLAZA_ADDRESS;
  } else {
    $("contract-addr").textContent = "TBD — belum deploy, tombol aksi nonaktif";
  }
  await refreshHolder();
  await loadWall();
}

async function loadWall() {
  if (!plaza) { $("wall").innerHTML = "<li>Kontrak belum deploy (alamat TBD). Wall aktif setelah deploy.</li>"; return; }
  const total = Number(await plaza.messageCount());
  const ul = $("wall");
  ul.innerHTML = "";
  if (total === 0) { ul.innerHTML = "<li>Belum ada pesan. Jadilah yang pertama check-in + posting.</li>"; return; }
  const start = Math.max(0, total - 20);
  const msgs = await plaza.getMessages(start, Math.min(20, total - start));
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    const name = await resolveAiName(m.poster);
    const founder = await plaza.isFounder(m.poster);
    const li = document.createElement("li");
    const when = new Date(Number(m.timestamp) * 1000).toLocaleString("id-ID");
    li.innerHTML = "";
    const b = document.createElement("b");
    b.textContent = (name || short(m.poster)) + (founder ? " 👑" : "");
    const addrBtn = document.createElement("button");
    addrBtn.textContent = short(m.poster);
    addrBtn.title = "Klik untuk isi ke form Tip / Vouch";
    addrBtn.onclick = () => { $("tip-to").value = m.poster; $("vouch-to").value = m.poster; };
    const span = document.createElement("span");
    span.textContent = ` — ${when}: ${m.text}`;
    li.append(b, " (", addrBtn, ")", span);
    ul.appendChild(li);
  }
}

async function loadBoard() {
  if (!plaza) { alert("Kontrak belum deploy."); return; }
  const n = Number(await plaza.interactorCount());
  const addrs = n === 0 ? [] : await plaza.getInteractors(0, Math.min(50, n));
  const rows = [];
  for (const a of addrs) {
    const r = await plaza.getReputation(a);
    rows.push({ addr: a, score: Number(r.score), streak: Number(r.streak), vouches: Number(r.vouches), tips: Number(r.tipsCount), founder: r.founder });
  }
  rows.sort((x, y) => y.score - x.score);
  const ol = $("board");
  ol.innerHTML = "";
  rows.slice(0, 10).forEach((r) => {
    const li = document.createElement("li");
    li.textContent = `${short(r.addr)}${r.founder ? " 👑 FOUNDER" : ""} — skor ${r.score} (streak ${r.streak}, vouch ${r.vouches}, tip diterima ${r.tips})`;
    ol.appendChild(li);
  });
  if (rows.length === 0) ol.innerHTML = "<li>Belum ada yang berinteraksi.</li>";
}

function needPlaza() {
  if (!plaza) { alert("Kontrak belum deploy (alamat TBD)."); return false; }
  if (!signer) { alert("Connect wallet dulu."); return false; }
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  $("btn-connect").onclick = connect;
  $("btn-refresh").onclick = loadWall;
  $("btn-board").onclick = loadBoard;
  $("btn-checkin").onclick = async () => {
    if (!needPlaza()) return;
    try { setMsg("checkin-msg", "Menunggu konfirmasi di wallet…"); const tx = await plaza.checkIn(); await tx.wait(); setMsg("checkin-msg", "✅ Check-in berhasil! Hash: " + tx.hash); await refreshHolder(); await loadWall(); }
    catch (e) { setMsg("checkin-msg", "❌ Gagal: " + (e.shortMessage || e.message), false); }
  };
  $("btn-post").onclick = async () => {
    if (!needPlaza()) return;
    const text = $("post-text").value.trim();
    if (!text) { setMsg("post-msg", "❌ Pesan kosong.", false); return; }
    try { setMsg("post-msg", "Menunggu konfirmasi di wallet…"); const tx = await plaza.postMessage(text); await tx.wait(); setMsg("post-msg", "✅ Pesan terkirim! Hash: " + tx.hash); $("post-text").value = ""; await loadWall(); }
    catch (e) { setMsg("post-msg", "❌ Gagal: " + (e.shortMessage || e.message), false); }
  };
  $("btn-tip").onclick = async () => {
    if (!needPlaza()) return;
    const to = $("tip-to").value.trim();
    const amt = $("tip-amount").value.trim();
    if (!ethers.isAddress(to)) { setMsg("tip-msg", "❌ Alamat penerima tidak valid.", false); return; }
    try {
      const value = ethers.parseEther(amt);
      setMsg("tip-msg", "Menunggu konfirmasi di wallet… (cek jumlah & alamat baik-baik sebelum confirm)");
      const tx = await plaza.tip(to, { value });
      await tx.wait();
      setMsg("tip-msg", `✅ Tip ${amt} BNB terkirim ke ${short(to)}! Hash: ` + tx.hash);
      await loadWall();
    } catch (e) { setMsg("tip-msg", "❌ Gagal: " + (e.shortMessage || e.message), false); }
  };
  $("btn-vouch").onclick = async () => {
    if (!needPlaza()) return;
    const to = $("vouch-to").value.trim();
    if (!ethers.isAddress(to)) { setMsg("vouch-msg", "❌ Alamat tidak valid.", false); return; }
    try { setMsg("vouch-msg", "Menunggu konfirmasi di wallet…"); const tx = await plaza.vouch(to); await tx.wait(); setMsg("vouch-msg", "✅ Vouch terkirim! Hash: " + tx.hash); await loadBoard(); }
    catch (e) { setMsg("vouch-msg", "❌ Gagal: " + (e.shortMessage || e.message), false); }
  };
});
