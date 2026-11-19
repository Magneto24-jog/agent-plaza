// Reproduksi urutan persis suite: checkIn, post, tip, vouch, lalu vouch duplikat via send polos.
const fs = require("fs");
const path = require("path");
const Ganache = require("ganache");
const { ethers } = require("ethers");
const ROOT = path.join(__dirname, "..");
const plazaJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "AgentPlaza.json"), "utf8"));
const mockJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "MockAgentID.json"), "utf8"));

async function main() {
  const server = Ganache.server({ logging: { quiet: true } });
  await server.listen(8548, "127.0.0.1");
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8548");
  const deployer = await provider.getSigner(0);
  const h1 = await provider.getSigner(1);
  const h2 = await provider.getSigner(2);
  const a1 = await h1.getAddress();
  const a2 = await h2.getAddress();

  const Mock = new ethers.ContractFactory(mockJson.abi, mockJson.bytecode, deployer);
  const mock = await Mock.deploy();
  await mock.waitForDeployment();
  const Plaza = new ethers.ContractFactory(plazaJson.abi, plazaJson.bytecode, deployer);
  const plaza = await Plaza.deploy(await mock.getAddress());
  await plaza.waitForDeployment();

  await (await mock.connect(deployer).mint(a1)).wait();
  await (await mock.connect(deployer).mint(a2)).wait();
  await (await plaza.connect(h1).checkIn()).wait();
  await (await plaza.connect(h1).postMessage("Halo")).wait();
  await (await plaza.connect(h1).tip(a2, { value: ethers.parseEther("0.01") })).wait();
  const txV1 = await plaza.connect(h1).vouch(a2);
  const rcV1 = await txV1.wait();
  console.log("vouch #1 status:", rcV1.status, "hasVouched:", await plaza.hasVouched(a1, a2));

  // Send polos seperti di suite
  try {
    const tx = await plaza.connect(h1).vouch(a2);
    console.log("send duplikat RESOLVED, hash:", tx.hash);
    const rc = await tx.wait();
    console.log("receipt status duplikat:", rc.status, "| hasVouched:", await plaza.hasVouched(a1, a2), "| vouches:", (await plaza.getReputation(a2)).vouches.toString());
  } catch (e) {
    console.log("send duplikat THROW:", (e.shortMessage || e.message).slice(0, 120));
    console.log("hasVouched setelah throw:", await plaza.hasVouched(a1, a2));
  }
  await server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
