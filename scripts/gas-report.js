// Ukur gasUsed tiap fungsi (Ganache). Angka ini HANYA untuk estimasi kasar:
// gas di BSC mainnet bisa beda (state, harga gas saat itu), dan harga BNB bergerak.
const fs = require("fs");
const path = require("path");
const Ganache = require("ganache");
const { ethers } = require("ethers");
const ROOT = path.join(__dirname, "..");
const plazaJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "AgentPlaza.json"), "utf8"));
const mockJson = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "MockAgentID.json"), "utf8"));

async function main() {
  const server = Ganache.server({ logging: { quiet: true } });
  await server.listen(8549, "127.0.0.1");
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8549");
  const deployer = await provider.getSigner(0);
  const h1 = await provider.getSigner(1);
  const h2 = await provider.getSigner(2);
  const a1 = await h1.getAddress();
  const a2 = await h2.getAddress();

  const Mock = new ethers.ContractFactory(mockJson.abi, mockJson.bytecode, deployer);
  const mock = await Mock.deploy();
  const mockRc = await (await mock.deploymentTransaction()).wait();
  console.log("deploy MockAgentID (test-only) gas:", mockRc.gasUsed.toString());
  const Plaza = new ethers.ContractFactory(plazaJson.abi, plazaJson.bytecode, deployer);
  const plaza = await Plaza.deploy(await mock.getAddress());
  const rcDeploy = await (await plaza.deploymentTransaction()).wait();
  console.log("deploy AgentPlaza gas:", rcDeploy.gasUsed.toString());

  await (await mock.connect(deployer).mint(a1)).wait();
  await (await mock.connect(deployer).mint(a2)).wait();

  const measure = async (label, txPromise) => {
    const rc = await (await txPromise).wait();
    console.log(`${label} gas:`, rc.gasUsed.toString());
  };
  await measure("checkIn (pertama, jadi Founder)", plaza.connect(h1).checkIn());
  await measure("postMessage (pendek)", plaza.connect(h1).postMessage("Halo Plaza"));
  await measure("tip 0.01 BNB", plaza.connect(h1).tip(a2, { value: ethers.parseEther("0.01") }));
  await measure("vouch", plaza.connect(h1).vouch(a2));
  // checkIn hari ke-2 (streak lanjut, bukan founder baru)
  await provider.send("evm_increaseTime", [86400]);
  await provider.send("evm_mine", []);
  await measure("checkIn (hari ke-2, streak lanjut)", plaza.connect(h1).checkIn());

  // Estimasi kasar BSC: gas medium 0.074 gwei (diukur 19 Nov 16:37 SGT), BNB $589.58
  const deployGas = Number(rcDeploy.gasUsed);
  const bnb = deployGas * 0.074e-9;
  console.log(`\nESTIMASI KASAR deploy di BSC (BUKAN janji): ${deployGas} gas x 0.074 gwei = ${bnb.toFixed(6)} BNB ~ $${(bnb * 589.58).toFixed(2)}`);
  console.log("Saldo wallet Magneto 0.02004 BNB (~$11.82) = ~148x estimasi deploy. Sisa saldo tetap cukup untuk beberapa tx susulan.");
  await server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
