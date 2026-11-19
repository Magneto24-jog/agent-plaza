// Debug T24: vouch duplikat — bug kontrak atau harness?
const fs = require("fs");
const path = require("path");
const Ganache = require("ganache");
const { ethers } = require("ethers");
const ROOT = path.join(__dirname, "..");
const plazaJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "AgentPlaza.json"), "utf8"));
const mockJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "MockAgentID.json"), "utf8"));

async function main() {
  const server = Ganache.server({ logging: { quiet: true } });
  await server.listen(8547, "127.0.0.1");
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8547");
  const deployer = await provider.getSigner(0);
  const holder1 = await provider.getSigner(1);
  const holder2 = await provider.getSigner(2);
  const a1 = await holder1.getAddress();
  const a2 = await holder2.getAddress();

  const Mock = new ethers.ContractFactory(mockJson.abi, mockJson.bytecode, deployer);
  const mock = await Mock.deploy();
  await mock.waitForDeployment();
  const Plaza = new ethers.ContractFactory(plazaJson.abi, plazaJson.bytecode, deployer);
  const plaza = await Plaza.deploy(await mock.getAddress());
  await plaza.waitForDeployment();

  await (await mock.connect(deployer).mint(a1)).wait();
  await (await mock.connect(deployer).mint(a2)).wait();

  const tx1 = await plaza.connect(holder1).vouch(a2);
  const rc1 = await tx1.wait();
  console.log("vouch #1 receipt status:", rc1.status, "| hasVouched:", await plaza.hasVouched(a1, a2));

  // Coba estimateGas manual untuk vouch duplikat
  try {
    const gas = await plaza.connect(holder1).vouch.estimateGas(a2);
    console.log("estimateGas duplikat: SUKSES, gas =", gas.toString(), " <-- ANEH, harus revert");
  } catch (e) {
    console.log("estimateGas duplikat: REVERT seperti diharapkan:", (e.shortMessage || e.message).slice(0, 100));
  }

  // Coba kirim tx duplikat dan lihat receipt
  try {
    const tx2 = await plaza.connect(holder1).vouch(a2, { gasLimit: 200000 });
    const rc2 = await tx2.wait();
    console.log("vouch #2 receipt status:", rc2.status, "| hasVouched:", await plaza.hasVouched(a1, a2));
    console.log("vouchesReceived a2:", (await plaza.getReputation(a2)).vouches.toString());
  } catch (e) {
    console.log("kirim tx duplikat: THROW:", (e.shortMessage || e.message).slice(0, 120));
  }
  await server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
