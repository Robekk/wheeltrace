// Shared reads against Squeekchain's public API (/v1/status + /v1/economy/state).
// Read-only: nothing here signs, stores keys, or writes to chain.

const API = 'https://api.squeekchain.com/v1';

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function getJSON(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { accept: 'application/json', 'user-agent': 'wheeltrace/1.0 (+squeekchain code lane)' },
    cf: { cacheTtl: 20, cacheEverything: true }
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

export async function fetchState() {
  const [status, economy] = await Promise.all([getJSON('/status'), getJSON('/economy/state')]);
  const m = status.measurement || {};
  const b = status.builder || {};
  const anchor = b.anchor || {};
  const projected = b.projected || {};
  const eco = economy.economy || economy;
  const supply = eco.supply || {};
  const rewards = eco.rewards || {};
  const chain = economy.chain || {};

  const cumulativeWork = num(anchor.cumulativeWork);
  const blockProgress = num(anchor.blockProgress);
  const workPerBlock = num(anchor.cumulativeBlockUnits) > 0
    ? num(anchor.cumulativeBlockUnits) / 1e6
    : 0;

  return {
    at: new Date().toISOString(),
    observedAt: m.observedAt || null,
    freshness: m.freshness || null,
    provenance: m.provenance || null,
    coreStatus: m.coreStatus || null,
    rpm: num(m.rpmMilli) / 1000,
    speedMmPerSecond: num(m.speedMmPerSecond),
    distanceMm: num(m.distanceMm),
    cumulativeWorkUnits: cumulativeWork,
    blockHeight: num(anchor.blockHeight),
    blockProgress,
    blockProgressPct: blockProgress > 0 ? Math.min(100, (blockProgress / 1e9) * 100) : 0,
    settledThroughRound: num(anchor.settledThroughRound),
    lastTx: anchor.transactionHash || null,
    confirmedAt: anchor.confirmedAt || null,
    projected: {
      blockHeight: num(projected.blockHeight),
      blockProgress: num(projected.blockProgress),
      lifecycle: projected.lifecycle || null,
      completedBlocks: num(projected.completedBlockCount)
    },
    economy: {
      chainId: chain.chainId || null,
      indexedThroughBlock: num(chain.indexedThroughBlock),
      safeThroughBlock: num(chain.safeThroughBlock),
      totalSupply: supply.liveSupplyBaseUnits != null ? String(supply.liveSupplyBaseUnits)
        : supply.total != null ? String(supply.total) : (supply.circulating != null ? String(supply.circulating) : null),
      emitted: supply.miningMintedBaseUnits != null ? String(supply.miningMintedBaseUnits)
        : supply.emitted != null ? String(supply.emitted) : null,
      burned: supply.totalBurnedBaseUnits != null ? String(supply.totalBurnedBaseUnits) : null,
      unminted: supply.unmintedCapacityBaseUnits != null ? String(supply.unmintedCapacityBaseUnits) : null,
      blockReward: rewards.blockReward != null ? String(rewards.blockReward) : null,
      releaseId: (economy.release || {}).id || null
    },
    // Derived: seconds per millimetre at the current speed, and a "is he running" flag
    isRunning: num(m.rpmMilli) > 0,
    metersTravelled: num(m.distanceMm) / 1000,
    raw: { status, economy }
  };
}

export function historyPath() { return '/api/history'; }

export default { fetchState, historyPath };
