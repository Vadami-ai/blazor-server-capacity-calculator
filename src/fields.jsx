// Field definitions, formatting helpers, shared small components.
import { useState, useMemo, useRef } from 'react';
import CORE from './calc-core.js';

const { fmtInt, fmtNum, fmtK, fmtCompact } = CORE;

const FIELDS = [
  // group: Users
  { id: 'users', label: 'Concurrent users', unit: '', step: 100, min: 0, max: 100000, group: 'Users', help: 'Peak signed-in users active at the same time. Use 95th percentile from monitoring.' },
  { id: 'tabs', label: 'Avg tabs per user', unit: '', step: 0.1, min: 1, max: 5, decimals: 1, group: 'Users', help: 'Browser tabs / windows each user typically keeps open with an active circuit.' },
  { id: 'discRatio', label: 'Disconnected ratio', unit: '%', step: 1, min: 0, max: 100, group: 'Users', help: 'Circuits retained in memory for the reconnect window during network churn or node drain.' },
  // group: Memory
  { id: 'perCircuitMB', label: 'Memory per circuit', unit: 'MB', step: 0.05, min: 0.05, max: 10, decimals: 2, group: 'Memory', help: 'Measured memory footprint per circuit. Workload-specific; pull from soak tests, not defaults.' },
  { id: 'overheadPct', label: 'App / runtime overhead', unit: '%', step: 1, min: 0, max: 200, group: 'Memory', help: 'Framework, app services, caches, allocations. Applied as a percentage uplift on circuit memory.' },
  { id: 'nodeUsableGB', label: 'Usable memory / node', unit: 'GB', step: 1, min: 1, max: 512, group: 'Memory', help: 'Memory budget per app node for the Blazor process, not total VM RAM. Reserve OS/agent headroom first.' },
  { id: 'sparePct', label: 'Spare capacity target', unit: '%', step: 1, min: 0, max: 90, group: 'Memory', help: 'Unused capacity held at peak for failover, deploys, and incident headroom. 20–40% is typical.' },
  // group: SignalR
  { id: 'connPerUnit', label: 'Connections / SignalR unit', unit: '', step: 100, min: 100, max: 100000, group: 'SignalR', help: 'Concurrent client connections supported per SignalR unit for your tier.' },
  { id: 'signalrHeadroom', label: 'SignalR headroom', unit: '%', step: 1, min: 0, max: 200, group: 'SignalR', help: 'Extra unit capacity above peak demand for reconnect bursts and operational safety.' },
  // group: Messages
  { id: 'msgUserMin', label: 'Messages / user / min', unit: '', step: 0.5, min: 0, max: 100, decimals: 1, group: 'Messages', help: 'Average real-time messages generated per user per minute across UI and notification events.' },
  { id: 'activeMinDay', label: 'Active minutes / day', unit: 'min', step: 10, min: 0, max: 1440, group: 'Messages', help: 'Estimated active usage minutes per user per day.' },
  { id: 'includedMsgUnitDay', label: 'Included messages / unit / day', unit: '', step: 10000, min: 0, max: 100000000, group: 'Messages', help: 'Included SignalR messages per unit per day at your tier. Update if SKU terms change.' },
];

const GROUPS = ['Users', 'Memory', 'SignalR', 'Messages'];

const GROUP_META = {
  Users: { label: 'Users & circuits', hint: 'Concurrency, tabs, reconnect buffer' },
  Memory: { label: 'Memory & nodes', hint: 'Per-circuit memory, overhead, node capacity' },
  SignalR: { label: 'SignalR', hint: 'Unit sizing and headroom' },
  Messages: { label: 'Message budget', hint: 'Daily message volume vs. included quota' },
};

// Tooltip primitive -------------------------------------------------------
function Tip({ text, children }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="tip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? <span className="tip-body" role="tooltip">{text}</span> : null}
    </span>
  );
}

function InfoDot({ text }) {
  return (
    <Tip text={text}>
      <button type="button" className="info-dot" aria-label="More info" tabIndex={0}>i</button>
    </Tip>
  );
}

// Numeric input with unit + stepper ---------------------------------------
function NumberField({ field, value, onChange }) {
  const { id, label, unit, min, max, step, help, decimals } = field;
  const display = typeof value === 'number' && !isNaN(value) ? value : '';
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        <span>{label}</span>
        <InfoDot text={help} />
      </label>
      <div className="field-input">
        <input
          id={id}
          type="number"
          value={display}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? '' : Number(v));
          }}
        />
        {unit ? <span className="field-unit">{unit}</span> : null}
      </div>
    </div>
  );
}

// KPI tile ---------------------------------------------------------------
function KpiTile({ label, value, sub, help, tone = 'neutral', big = false }) {
  return (
    <div className={`kpi kpi-${tone}${big ? ' kpi-big' : ''}`}>
      <div className="kpi-head">
        <span className="kpi-label">{label}</span>
        {help ? <InfoDot text={help} /> : null}
      </div>
      <div className="kpi-val">{value}</div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}

// Scenario table ---------------------------------------------------------
function ScenarioTable({ inputs, patternKey, highlight }) {
  const scenarios = useMemo(() => CORE.scenarioSet(inputs, patternKey), [inputs, patternKey]);
  return (
    <div className="scen-wrap">
      <table className="scen-table">
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Users</th>
            <th>Active circuits</th>
            <th>Total circuits</th>
            <th>Memory <span className="u">GB</span></th>
            <th>Nodes</th>
            <th>SignalR</th>
            <th>Daily msgs</th>
            <th>Budget</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((r) => {
            const isHl = highlight != null && Math.abs(r.users - highlight) < 1;
            return (
              <tr key={r.users} className={isHl ? 'scen-hl' : ''}>
                <td className="scen-label">{fmtK(r.users)}</td>
                <td>{fmtInt(r.users)}</td>
                <td>{fmtInt(r.activeCircuits)}</td>
                <td>{fmtInt(r.totalCircuits)}</td>
                <td>{fmtNum(r.totalBlazorMemoryGB)}</td>
                <td>{fmtInt(r.nodesWithSpare)}</td>
                <td>{fmtInt(r.signalrUnits)}</td>
                <td>{fmtCompact(r.dailyMessages)}</td>
                <td>
                  <span className={`pill pill-${r.status}`}>
                    {r.status === 'good' ? 'Covered' : r.status === 'warn' ? `+${r.additionalUnitsForMessages} unit${r.additionalUnitsForMessages === 1 ? '' : 's'}` : 'Insufficient'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Scaling curve chart: nodes / units / memory, with toggle + fixed readout below
function ScalingChart({ inputs, patternKey, highlightUsers }) {
  const [vis, setVis] = useState({ nodes: true, units: true, memory: true });
  const [hover, setHover] = useState(null); // {u}
  const [readoutOn, setReadoutOn] = useState(false);
  const svgRef = useRef(null);

  const points = useMemo(() => {
    const adjusted = CORE.applyPattern(inputs, patternKey);
    const xs = [];
    for (let u = 500; u <= 30000; u += 500) xs.push(u);
    return xs.map((u) => ({ u, r: CORE.calculate(u, adjusted) }));
  }, [inputs, patternKey]);

  const W = 680;
  const H = 240;
  const PAD = { l: 48, r: 56, t: 24, b: 30 };
  const maxUsers = 30000;
  const maxNodes  = Math.max(4, ...points.map((p) => p.r.nodesWithSpare));
  const maxUnits  = Math.max(8, ...points.map((p) => p.r.signalrUnits));
  const maxMemory = Math.max(4, ...points.map((p) => p.r.totalBlazorMemoryGB));

  const xScale = (u) => PAD.l + (u / maxUsers) * (W - PAD.l - PAD.r);
  const yNode = (n) => H - PAD.b - (n / maxNodes) * (H - PAD.t - PAD.b);
  const yUnit = (n) => H - PAD.b - (n / maxUnits) * (H - PAD.t - PAD.b);
  const yMem  = (n) => H - PAD.b - (n / maxMemory) * (H - PAD.t - PAD.b);

  const pathNodes  = points.map((p, i) => `${i ? 'L' : 'M'}${xScale(p.u).toFixed(1)},${yNode(p.r.nodesWithSpare).toFixed(1)}`).join(' ');
  const pathUnits  = points.map((p, i) => `${i ? 'L' : 'M'}${xScale(p.u).toFixed(1)},${yUnit(p.r.signalrUnits).toFixed(1)}`).join(' ');
  const pathMemory = points.map((p, i) => `${i ? 'L' : 'M'}${xScale(p.u).toFixed(1)},${yMem(p.r.totalBlazorMemoryGB).toFixed(1)}`).join(' ');

  const xTicks = [0, 5000, 10000, 15000, 20000, 25000, 30000];
  const ticks = 4;
  const nodeStep = Math.ceil(maxNodes / ticks);
  const unitStep = Math.ceil(maxUnits / ticks);

  const hlActive = points.reduce((best, p) => !best || Math.abs(p.u - highlightUsers) < Math.abs(best.u - highlightUsers) ? p : best, null);
  const hoverPoint = (readoutOn && hover) ? points.reduce((best, p) => !best || Math.abs(p.u - hover.u) < Math.abs(best.u - hover.u) ? p : best, null) : null;
  const shown = hoverPoint || hlActive;
  const readoutPoint = readoutOn ? shown : hlActive;

  const onMove = (e) => {
    if (!readoutOn) return;
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const ratio = (x - PAD.l) / (W - PAD.l - PAD.r);
    const u = Math.max(500, Math.min(maxUsers, Math.round(ratio * maxUsers / 500) * 500));
    setHover({ u });
  };
  const onLeave = () => setHover(null);

  const toggle = (key) => setVis((v) => ({ ...v, [key]: !v[key] }));

  return (
    <div className="chart">
      <div className="chart-head">
        <div className="chart-title">Scaling curve</div>
        <div className="chart-legend">
          <button type="button" className={`lg-item lg-toggle${vis.nodes ? '' : ' lg-off'}`} onClick={() => toggle('nodes')}>
            <span className="lg-dot lg-nodes" /> App nodes
          </button>
          <button type="button" className={`lg-item lg-toggle${vis.units ? '' : ' lg-off'}`} onClick={() => toggle('units')}>
            <span className="lg-dot lg-units" /> SignalR units
          </button>
          <button type="button" className={`lg-item lg-toggle${vis.memory ? '' : ' lg-off'}`} onClick={() => toggle('memory')}>
            <span className="lg-dot lg-memory" /> Memory (GB)
          </button>
          <button
            type="button"
            className={`chart-readout-toggle${readoutOn ? ' active' : ''}`}
            onClick={() => { setReadoutOn((v) => !v); if (readoutOn) setHover(null); }}
            aria-pressed={readoutOn}
            title="Show detailed readout for hovered point"
          >
            {readoutOn ? '✓ Inspect on' : 'Inspect'}
          </button>
        </div>
      </div>
      <div className="chart-shell">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={`chart-svg${readoutOn ? ' chart-svg-inspect' : ''}`}
          role="img"
          aria-label="Scaling curve"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const y = PAD.t + (i * (H - PAD.t - PAD.b)) / 4;
            return <line key={i} x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} className="grid-line" />;
          })}
          {xTicks.map((u) => (
            <g key={u}>
              <line x1={xScale(u)} x2={xScale(u)} y1={H - PAD.b} y2={H - PAD.b + 4} className="axis-tick" />
              <text x={xScale(u)} y={H - 10} className="axis-label" textAnchor="middle">{fmtK(u)}</text>
            </g>
          ))}
          {Array.from({ length: ticks + 1 }).map((_, i) => {
            const v = i * nodeStep;
            return <text key={i} x={PAD.l - 8} y={yNode(v) + 3} className="axis-label axis-nodes" textAnchor="end">{v}</text>;
          })}
          {Array.from({ length: ticks + 1 }).map((_, i) => {
            const v = i * unitStep;
            return <text key={i} x={W - PAD.r + 6} y={yUnit(v) + 3} className="axis-label axis-units" textAnchor="start">{v}</text>;
          })}
          <text x={PAD.l - 8} y={PAD.t - 8} className="axis-label axis-nodes" textAnchor="end">nodes</text>
          <text x={W - PAD.r + 6} y={PAD.t - 8} className="axis-label axis-units" textAnchor="start">units</text>

          {vis.memory ? <path d={pathMemory} className="line line-memory" /> : null}
          {vis.units ? <path d={pathUnits} className="line line-units" /> : null}
          {vis.nodes ? <path d={pathNodes} className="line line-nodes" /> : null}

          {shown ? (
            <g>
              <line x1={xScale(shown.u)} x2={xScale(shown.u)} y1={PAD.t} y2={H - PAD.b} className="hl-line" />
              {vis.nodes ? <circle cx={xScale(shown.u)} cy={yNode(shown.r.nodesWithSpare)} r="4.5" className="hl-dot hl-dot-nodes" /> : null}
              {vis.units ? <circle cx={xScale(shown.u)} cy={yUnit(shown.r.signalrUnits)} r="4.5" className="hl-dot hl-dot-units" /> : null}
              {vis.memory ? <circle cx={xScale(shown.u)} cy={yMem(shown.r.totalBlazorMemoryGB)} r="4.5" className="hl-dot hl-dot-memory" /> : null}
            </g>
          ) : null}
        </svg>
      </div>

      {/* Fixed readout window below the chart, visible only when Inspect is on */}
      {readoutOn ? (
        <div className="chart-readout">
          <div className="readout-head">
            <div>
              <div className="readout-eyebrow">{hoverPoint ? 'Hovered point' : 'Current scenario'}</div>
              <div className="readout-users">
                {readoutPoint ? CORE.fmtInt(readoutPoint.u) : '—'} <span className="readout-unit">users</span>
              </div>
            </div>
            <div className={`readout-status pill pill-${readoutPoint ? readoutPoint.r.status : 'good'}`}>
              {readoutPoint ? (readoutPoint.r.status === 'good'
                ? 'Budget covered'
                : readoutPoint.r.status === 'warn'
                  ? `Add ${readoutPoint.r.additionalUnitsForMessages} unit${readoutPoint.r.additionalUnitsForMessages === 1 ? '' : 's'}`
                  : 'Budget short') : '—'}
            </div>
          </div>
          <div className="readout-grid">
            <div className="readout-cell">
              <span className="readout-swatch lg-nodes" />
              <div className="readout-label">App nodes</div>
              <div className="readout-val">{readoutPoint ? readoutPoint.r.nodesWithSpare : '—'}</div>
            </div>
            <div className="readout-cell">
              <span className="readout-swatch lg-units" />
              <div className="readout-label">SignalR units</div>
              <div className="readout-val">{readoutPoint ? readoutPoint.r.signalrUnits : '—'}</div>
            </div>
            <div className="readout-cell">
              <span className="readout-swatch lg-memory" />
              <div className="readout-label">Memory</div>
              <div className="readout-val">{readoutPoint ? CORE.fmtNum(readoutPoint.r.totalBlazorMemoryGB, 1) : '—'} <span className="readout-sub">GB</span></div>
            </div>
            <div className="readout-cell">
              <span className="readout-swatch readout-swatch-muted" />
              <div className="readout-label">Daily messages</div>
              <div className="readout-val">{readoutPoint ? CORE.fmtCompact(readoutPoint.r.dailyMessages) : '—'}</div>
            </div>
          </div>
          <div className="readout-hint">
            {hoverPoint ? 'Move along the chart to inspect any user count.' : 'Hover the chart to inspect any user count.'}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export {
  CORE,
  FIELDS,
  GROUPS,
  GROUP_META,
  Tip,
  InfoDot,
  NumberField,
  KpiTile,
  ScenarioTable,
  ScalingChart,
};
