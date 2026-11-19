// Compile AgentPlaza.sol + MockAgentID.sol dengan solc-js (offline setelah install).
// Output: build/AgentPlaza.json + build/MockAgentID.json (abi + bytecode).
// Dipakai juga oleh test/test.js.
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "build");
fs.mkdirSync(OUT, { recursive: true });

function load(file) {
  return fs.readFileSync(path.join(ROOT, "contracts", file), "utf8");
}

const input = {
  language: "Solidity",
  sources: {
    "AgentPlaza.sol": { content: load("AgentPlaza.sol") },
    "MockAgentID.sol": { content: load("MockAgentID.sol") },
  },
  settings: {
    // evmVersion "paris" (bukan default Cancun): solc >=0.8.24 default Cancun dan
    // bisa meng-emit MCOPY (opcode Cancun). BSC + Ganache default tidak menjamin
    // opcode itu — hasil tes: getMessages gagal "invalid opcode" dengan default.
    // Paris aman untuk BSC dan untuk semua EVM modern. Kontrak ini tidak butuh
    // fitur Cancun (tanpa transient storage, tanpa blob).
    evmVersion: "paris",
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

let hasError = false;
for (const e of output.errors || []) {
  console.log(`[${e.severity}] ${e.formattedMessage}`);
  if (e.severity === "error") hasError = true;
}
if (hasError) {
  console.error("COMPILE FAILED");
  process.exit(1);
}

for (const [file, contracts] of Object.entries(output.contracts)) {
  for (const [name, c] of Object.entries(contracts)) {
    const out = {
      contractName: name,
      source: file,
      abi: c.abi,
      bytecode: "0x" + c.evm.bytecode.object,
      deployedBytecode: "0x" + c.evm.deployedBytecode.object,
      bytecodeSizeBytes: c.evm.bytecode.object.length / 2,
    };
    fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(out, null, 2));
    console.log(`OK ${name}: bytecode ${out.bytecodeSizeBytes} bytes, abi ${c.abi.length} entries`);
  }
}
console.log("COMPILE OK -> build/");
