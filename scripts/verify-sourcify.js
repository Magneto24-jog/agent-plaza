// Verifikasi AgentPlaza di Sourcify v2 (gratis, tanpa API key).
// Endpoint benar (docs.sourcify.dev): POST /server/v2/verify/{chainId}/{address}
// Body JSON: { chosenContract, stdJson } — stdJson SAMA PERSIS dengan saat compile/deploy
// (solc 0.8.26, optimizer 200, evmVersion paris).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ADDRESS = "0x8aeF6CF342768F3343484347aB89ae64e0F3Fe46";
const CHAIN = 56;

async function main() {
  const load = (f) => fs.readFileSync(path.join(ROOT, "contracts", f), "utf8");
  const stdJson = {
    language: "Solidity",
    sources: {
      "AgentPlaza.sol": { content: load("AgentPlaza.sol") },
      "MockAgentID.sol": { content: load("MockAgentID.sol") },
    },
    settings: {
      evmVersion: "paris",
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"] } },
    },
  };
  fs.writeFileSync(path.join(ROOT, "standard.json"), JSON.stringify(stdJson, null, 2));

  const url = `https://sourcify.dev/server/v2/verify/${CHAIN}/${ADDRESS}`;
  console.log("POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contractIdentifier: "AgentPlaza.sol:AgentPlaza", compilerVersion: "v0.8.38+commit.1835d247", stdJsonInput: stdJson }),
  });
  const text = await res.text();
  console.log("HTTP", res.status);
  console.log(text.slice(0, 3000));
  let j = null;
  try { j = JSON.parse(text); } catch (_) {}
  const vid = j && (j.verificationId || (j.result && j.result.verificationId));
  if (vid) {
    console.log("verificationId:", vid, "— polling status...");
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const s = await fetch(`https://sourcify.dev/server/v2/verify/${vid}`);
      const st = await s.text();
      console.log("poll", i + 1, "HTTP", s.status, st.slice(0, 1000));
      try {
        const sj = JSON.parse(st);
        const status = sj.status || (sj.result && sj.result.status);
        if (status && status !== "pending") break;
      } catch (_) {}
    }
  }
}

main().catch((e) => { console.error("SOURCIFY FAILED:", e.message); process.exit(1); });
