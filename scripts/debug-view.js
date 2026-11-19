// Debug getMessages / getInteractors secara terpisah.
const fs = require("fs");
const path = require("path");
const Ganache = require("ganache");
const { ethers } = require("ethers");
const ROOT = path.join(__dirname, "..");
const plazaJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "AgentPlaza.json"), "utf8"));
const mockJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "MockAgentID.json"), "utf8"));

async function main() {
  const server = Ganache.server({ logging: { quiet: true } });
  await server.listen(8546, "127.0.0.1");
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8546");
  const deployer = await provider.getSigner(0);
  const holder = await provider.getSigner(1);

  const Mock = new ethers.ContractFactory(mockJson.abi, mockJson.bytecode, deployer);
  const mock = await Mock.deploy();
  await mock.waitForDeployment();
  const Plaza = new ethers.ContractFactory(plazaJson.abi, plazaJson.bytecode, deployer);
  const plaza = await Plaza.deploy(await mock.getAddress());
  await plaza.waitForDeployment();

  await (await mock.connect(deployer).mint(await holder.getAddress())).wait();
  await (await plaza.connect(holder).postMessage("Halo debug")).wait();
  console.log("messageCount:", (await plaza.messageCount()).toString());

  try {
    const m0 = await plaza.messages(0);
    console.log("messages(0) OK:", m0[0], "|", m0[1]);
  } catch (e) { console.log("messages(0) FAIL:", e.shortMessage || e.message); }

  for (const [off, lim] of [[0, 1], [0, 10], [0, 50]]) {
    try {
      const r = await plaza.getMessages(off, lim);
      console.log(`getMessages(${off},${lim}) OK:`, r.length, "pesan");
    } catch (e) { console.log(`getMessages(${off},${lim}) FAIL:`, (e.info && e.info.error && e.info.error.message) || e.shortMessage || e.message); }
  }
  try {
    const r = await plaza.getInteractors(0, 10);
    console.log("getInteractors(0,10) OK:", r.length);
  } catch (e) { console.log("getInteractors FAIL:", e.shortMessage || e.message); }
  try {
    const r = await plaza.getReputation(await holder.getAddress());
    console.log("getReputation OK: score", r.score.toString());
  } catch (e) { console.log("getReputation FAIL:", e.shortMessage || e.message); }

  await server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
