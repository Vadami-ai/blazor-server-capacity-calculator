// Shared calculation core. Pure functions, no UI dependencies.
const PATTERN_PROFILES = {
  A: {
    key: 'A',
    label: 'Pattern A',
    name: 'Azure Managed',
    desc: 'Blazor Server + Azure SignalR Service + SQL Server + Redis/HybridCache + background workers.',
    circuitFactor: 1.0,
    overheadAdd: 0.0,
    signalrFactor: 1.0,
    messageFactor: 1.0,
  },
  B: {
    key: 'B',
    label: 'Pattern B',
    name: 'Self-managed',
    desc: 'Blazor Server app tier + Redis backplane + SQL Server with strict affinity / load-balancer controls.',
    circuitFactor: 1.1,
    overheadAdd: 0.1,
    signalrFactor: 1.0,
    messageFactor: 1.0,
  },
  C: {
    key: 'C',
    label: 'Pattern C',
    name: 'Workload split',
    desc: 'Interactive UI on Blazor Server; heavy jobs (reports / exports / recalc) run async in worker services.',
    circuitFactor: 0.85,
    overheadAdd: 0.05,
    signalrFactor: 1.0,
    messageFactor: 1.0,
  },
};

const DEFAULT_INPUTS = {
  users: 8000,
  tabs: 1.3,
  discRatio: 10,
  perCircuitMB: 0.45,
  overheadPct: 30,
  nodeUsableGB: 12,
  sparePct: 30,
  connPerUnit: 1000,
  signalrHeadroom: 25,
  msgUserMin: 3,
  activeMinDay: 400,
  includedMsgUnitDay: 1000000,
};

const PRESETS = [1000, 5000, 8000, 10000, 15000, 25000];

function applyPattern(inputs, patternKey) {
  const p = PATTERN_PROFILES[patternKey];
  return {
    ...inputs,
    perCircuitMB: inputs.perCircuitMB * p.circuitFactor,
    overheadPct: Math.max(0, inputs.overheadPct + p.overheadAdd * 100),
    signalrHeadroom: Math.max(0, inputs.signalrHeadroom * p.signalrFactor),
    msgUserMin: Math.max(0, inputs.msgUserMin * p.messageFactor),
  };
}

function calculate(users, p) {
  const activeCircuits = users * p.tabs;
  const disconnectedCircuits = activeCircuits * (p.discRatio / 100);
  const totalCircuits = activeCircuits + disconnectedCircuits;
  const circuitMemoryGB = (totalCircuits * p.perCircuitMB) / 1024;
  const totalBlazorMemoryGB = circuitMemoryGB * (1 + p.overheadPct / 100);
  const nodesRaw = p.nodeUsableGB > 0 ? totalBlazorMemoryGB / p.nodeUsableGB : 0;
  const sparePct = Math.min(0.95, Math.max(0, p.sparePct / 100));
  const nodesWithSpare = Math.ceil(nodesRaw / (1 - sparePct));
  const signalrUnitsRaw = p.connPerUnit > 0 ? activeCircuits / p.connPerUnit : 0;
  const signalrUnits = Math.ceil(signalrUnitsRaw * (1 + p.signalrHeadroom / 100));
  const dailyMessages = users * p.msgUserMin * p.activeMinDay;
  const includedMessages = signalrUnits * p.includedMsgUnitDay;
  const messageCoverage = includedMessages - dailyMessages;
  const additionalUnitsForMessages =
    p.includedMsgUnitDay > 0
      ? Math.max(0, Math.ceil((dailyMessages - includedMessages) / p.includedMsgUnitDay))
      : 0;
  let status = 'good';
  if (messageCoverage < 0) status = additionalUnitsForMessages <= 3 ? 'warn' : 'bad';
  return {
    users,
    activeCircuits,
    disconnectedCircuits,
    totalCircuits,
    circuitMemoryGB,
    totalBlazorMemoryGB,
    nodesRaw,
    nodesWithSpare,
    signalrUnitsRaw,
    signalrUnits,
    dailyMessages,
    includedMessages,
    messageCoverage,
    additionalUnitsForMessages,
    status,
  };
}

function scenarioSet(inputs, patternKey) {
  const adjusted = applyPattern(inputs, patternKey);
  return PRESETS.map((u) => calculate(u, adjusted));
}

function fmtInt(n) {
  if (!isFinite(n)) return '—';
  return Math.round(n).toLocaleString();
}
function fmtNum(n, d = 2) {
  if (!isFinite(n)) return '—';
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}
function fmtK(n) {
  if (n >= 1000) return (n / 1000) + 'k';
  return String(n);
}
function fmtCompact(n) {
  if (!isFinite(n)) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + 'k';
  return String(Math.round(n));
}

const CalcCore = {
  PATTERN_PROFILES,
  DEFAULT_INPUTS,
  PRESETS,
  applyPattern,
  calculate,
  scenarioSet,
  fmtInt,
  fmtNum,
  fmtK,
  fmtCompact,
};

export default CalcCore;
export {
  PATTERN_PROFILES,
  DEFAULT_INPUTS,
  PRESETS,
  applyPattern,
  calculate,
  scenarioSet,
  fmtInt,
  fmtNum,
  fmtK,
  fmtCompact,
};
