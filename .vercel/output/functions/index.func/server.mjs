import { __require } from "./_virtual/rolldown_runtime.mjs";

//#region server.js
const http = __require("node:http");
const fs = __require("node:fs");
const path = __require("node:path");
const PORT = Number(process.env.PORT || 8899);
const API = "https://api.squeekchain.com/v1";
const UA = "wheeltrace/1.0 (+squeekchain code lane)";
const getJSON = async (p) => {
	const r = await fetch(API + p, { headers: {
		accept: "application/json",
		"user-agent": UA
	} });
	if (!r.ok) throw new Error(`${p} -> HTTP ${r.status}`);
	return r.json();
};
const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
async function state() {
	const [status, economy] = await Promise.all([getJSON("/status"), getJSON("/economy/state")]);
	const m = status.measurement || {}, b = status.builder || {};
	const a = b.anchor || {}, pj = b.projected || {};
	const eco = economy.economy || economy, chain = economy.chain || {};
	const supply = eco.supply || {}, rewards = eco.rewards || {};
	return {
		at: (/* @__PURE__ */ new Date()).toISOString(),
		observedAt: m.observedAt || null,
		freshness: m.freshness || null,
		provenance: m.provenance || null,
		coreStatus: m.coreStatus || null,
		rpm: num(m.rpmMilli) / 1e3,
		speedMmPerSecond: num(m.speedMmPerSecond),
		distanceMm: num(m.distanceMm),
		cumulativeWorkUnits: num(a.cumulativeWork),
		blockHeight: num(a.blockHeight),
		blockProgress: num(a.blockProgress),
		blockProgressPct: Math.min(100, num(a.blockProgress) / 1e9 * 100),
		settledThroughRound: num(a.settledThroughRound),
		lastTx: a.transactionHash || null,
		confirmedAt: a.confirmedAt || null,
		projected: {
			blockHeight: num(pj.blockHeight),
			blockProgress: num(pj.blockProgress),
			lifecycle: pj.lifecycle || null,
			completedBlocks: num(pj.completedBlockCount)
		},
		economy: {
			chainId: chain.chainId || null,
			indexedThroughBlock: num(chain.indexedThroughBlock),
			safeThroughBlock: num(chain.safeThroughBlock),
			totalSupply: supply.total != null ? String(supply.total) : null,
			emitted: supply.emitted != null ? String(supply.emitted) : null,
			blockReward: rewards.blockReward != null ? String(rewards.blockReward) : null,
			releaseId: (economy.release || {}).id || null
		},
		isRunning: num(m.rpmMilli) > 0,
		metersTravelled: num(m.distanceMm) / 1e3
	};
}
http.createServer(async (req, res) => {
	const url = new URL(req.url, "http://localhost");
	const json = (code, body) => {
		res.writeHead(code, {
			"content-type": "application/json; charset=utf-8",
			"access-control-allow-origin": "*",
			"cache-control": "no-store"
		});
		res.end(JSON.stringify(body));
	};
	if (url.pathname === "/" || url.pathname === "/index.html") {
		const html = fs.readFileSync(path.join(import.meta.dirname, "index.html"));
		res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
		return res.end(html);
	}
	if (url.pathname === "/api/wheel") try {
		return json(200, await state());
	} catch (e) {
		return json(502, { error: String(e.message || e) });
	}
	if (url.pathname === "/health") return json(200, {
		ok: true,
		at: (/* @__PURE__ */ new Date()).toISOString()
	});
	json(404, { error: "not_found" });
}).listen(PORT, () => console.log(`wheeltrace on http://127.0.0.1:${PORT}`));

//#endregion
export {  };