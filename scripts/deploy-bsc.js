// Deploy AgentPlaza ke BSC mainnet via burner EOA (bukan via baw — baw tidak bisa deploy).
// JANGAN jalankan sebelum burner terdanai gas. Private key DIBACA dari .deployer-key.json
// (mode 600, di-.gitignore, JANGAN commit / kirim ke mana pun).
// Constructor arg: Agent ID 0x60b9262456de011f7d15a54cdd8c48baaa8b022f
// Output: deployment.json (alamat kontrak + txHash) — JANGAN deploy MockAgentID ke mainnet.
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ROOT = path.join(__dirname, "..");
const AGENT_ID = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";
const RPCS = [
  "https://bsc-dataseed1.bnbchain.org/",
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
  "https://bsc.publicnode.com",
];

async function main() {
  const keyFile = path.join(ROOT, ".deployer-key.json");
  if (!fs.existsSync(keyFile)) {
    console.error("MISSING .deployer-key.json — burner belum dibuat");
    process.exit(1);
  }
  const { address, privateKey } = JSON.parse(fs.readFileSync(keyFile, "utf8"));
  const plazaJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "AgentPlaza.json"), "utf8"));

  let provider = null;
  let lastErr = null;
  for (const url of RPCS) {
    try {
      // chainId 56 langsung = static network, skip deteksi network ethers
      // (deteksi pernah timeout padahal RPC hidup via curl).
      const p = new ethers.JsonRpcProvider(url, 56);
      const b = await p.getBlockNumber();
      provider = p;
      console.log("RPC OK:", url, "block", b);
      break;
    } catch (e) {
      lastErr = e;
      console.log("RPC FAIL:", url, (e.shortMessage || e.message || "").slice(0, 100));
    }
  }
  if (!provider) {
    console.error("Semua RPC BSC gagal:", lastErr && (lastErr.shortMessage || lastErr.message));
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  if (wallet.address.toLowerCase() !== address.toLowerCase()) {
    console.error("Alamat key tidak cocok dengan deployer-address.txt");
    process.exit(1);
  }
  const bal = await provider.getBalance(wallet.address);
  console.log("Deployer:", wallet.address);
  console.log("Saldo:", ethers.formatEther(bal), "BNB");
  const feeData = await provider.getFeeData();
  console.log("Gas price:", feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, "gwei") + " gwei" : "n/a");
  if (bal < ethers.parseEther("0.0002")) {
    console.error("Saldo kurang dari 0.0002 BNB — danai dulu burner sebelum deploy.");
    process.exit(1);
  }

  const factory = new ethers.ContractFactory(plazaJson.abi, plazaJson.bytecode, wallet);
  console.log("Deploying AgentPlaza, constructor Agent ID:", AGENT_ID);
  const contract = await factory.deploy(AGENT_ID);
  console.log("Deploy txHash:", contract.deploymentTransaction().hash);
  console.log("Menunggu konfirmasi...");
  await contract.waitForDeployment();
  const deployed = await contract.getAddress();
  console.log("DEPLOYED:", deployed);
  const receipt = await contract.deploymentTransaction().wait();
  console.log("Gas used:", receipt.gasUsed.toString(), "| status:", receipt.status);
  fs.writeFileSync(
    path.join(ROOT, "deployment.json"),
    JSON.stringify({ network: "BSC mainnet (56)", contract: "AgentPlaza", address: deployed, deployTxHash: contract.deploymentTransaction().hash, deployer: wallet.address, agentId: AGENT_ID, deployedAt: new Date().toISOString() }, null, 2)
  );
  console.log("Tersimpan di deployment.json — lanjut: verifikasi BscScan + isi PLAZA_ADDRESS di frontend/app.js");
}

main().catch((e) => { console.error("DEPLOY FAILED:", e.shortMessage || e.message); process.exit(1); });
