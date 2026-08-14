// Calculator state hooks, header, inputs, and result panels.
import { useState, useMemo, useCallback } from 'react';
import CORE from './calc-core.js';
import { FIELDS, GROUPS, GROUP_META, NumberField } from './fields.jsx';

const STORAGE_KEY = 'bsc_plans_v1';

// ---------- Shared hook: calculator state ----------
function useCalculator(initial = CORE.DEFAULT_INPUTS, initialPattern = 'A') {
  const [inputs, setInputs] = useState(initial);
  const [pattern, setPattern] = useState(initialPattern);

  const adjusted = useMemo(() => CORE.applyPattern(inputs, pattern), [inputs, pattern]);
  const result = useMemo(() => CORE.calculate(inputs.users, adjusted), [inputs.users, adjusted]);
  const scenarios = useMemo(() => CORE.scenarioSet(inputs, pattern), [inputs, pattern]);

  const setField = useCallback((id, value) => {
    setInputs((prev) => ({ ...prev, [id]: value === '' ? 0 : Number(value) }));
  }, []);

  const reset = useCallback(() => {
    setInputs(CORE.DEFAULT_INPUTS);
    setPattern('A');
  }, []);

  return { inputs, setInputs, pattern, setPattern, adjusted, result, scenarios, setField, reset };
}

// ---------- Saved plans (localStorage) ----------
function useSavedPlans() {
  const [plans, setPlans] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const persist = useCallback((next) => {
    setPlans(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);
  const save = useCallback((name, inputs, pattern) => {
    const next = [{ id: Date.now(), name, inputs, pattern, at: new Date().toISOString() }, ...plans].slice(0, 12);
    persist(next);
  }, [plans, persist]);
  const remove = useCallback((id) => {
    persist(plans.filter((p) => p.id !== id));
  }, [plans, persist]);
  return { plans, save, remove };
}

// ---------- Header ----------
function AppHeader({ onPrint, onCopy, onReset }) {
  return (
    <header className="app-header no-print">
      <div className="app-brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
        <div>
          <div className="brand-title">Blazor Server Capacity Calculator</div>
          <div className="brand-sub">Size app nodes, SignalR units, and message budget for real-time Blazor Server workloads.</div>
        </div>
      </div>
      <div className="app-actions">
        <button className="btn btn-sm" onClick={onReset}>Reset</button>
        <button className="btn btn-sm" onClick={onPrint}>Print / PDF</button>
        <button className="btn btn-sm btn-primary" onClick={onCopy}>Copy summary</button>
      </div>
    </header>
  );
}

// ---------- Pattern selector ----------
function PatternSelector({ pattern, setPattern }) {
  return (
    <div className="pattern-grid">
      {['A', 'B', 'C'].map((k) => {
        const p = CORE.PATTERN_PROFILES[k];
        const active = pattern === k;
        return (
          <button key={k} className={`pattern-card${active ? ' active' : ''}`} onClick={() => setPattern(k)}>
            <div className="p-key">{p.label}</div>
            <div className="p-name">{p.name}</div>
            <div className="p-desc">{p.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Big user slider with presets ----------
function UserSlider({ value, onChange }) {
  const MIN = 500;
  const MAX = 30000;
  const pct = Math.max(0, Math.min(100, ((value - MIN) / (MAX - MIN)) * 100));
  const presets = CORE.PRESETS;
  return (
    <div className="slider-shell">
      <div className="slider-head">
        <div className="s-label">Concurrent users</div>
        <div className="slider-value">
          <span className="v">{CORE.fmtInt(value)}</span>
          <span className="u">peak</span>
        </div>
      </div>
      <input
        className="range"
        type="range"
        min={MIN}
        max={MAX}
        step={100}
        value={value}
        style={{ '--p': pct + '%' }}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Concurrent users"
      />
      <div className="slider-ticks">
        {presets.map((u) => (
          <button key={u} className={Math.abs(u - value) < 50 ? 'active' : ''} onClick={() => onChange(u)}>
            {CORE.fmtK(u)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Inputs card (grouped) ----------
function InputsCard({ inputs, setField }) {
  const [openGroup, setOpenGroup] = useState('Users');
  return (
    <div className="card">
      <div className="card-head">
        <h3>Assumptions</h3>
        <span className="card-hint">Editable · 12 inputs</span>
      </div>
      {GROUPS.map((g) => {
        const fields = FIELDS.filter((f) => f.group === g);
        const open = openGroup === g;
        return (
          <div key={g}>
            <div className={`collapse-head${open ? ' collapse-open' : ''}`} onClick={() => setOpenGroup(open ? null : g)}>
              <div>
                <h4>{GROUP_META[g].label}</h4>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>{GROUP_META[g].hint}</div>
              </div>
              <span className="collapse-chev">›</span>
            </div>
            {open ? (
              <div className="collapse-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {fields.map((f) => (
                    <NumberField key={f.id} field={f} value={inputs[f.id]} onChange={(v) => setField(f.id, v)} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Pattern factors editor ----------
function FactorEditor({ pattern }) {
  // Read-only snapshot: the PRD mentions editable factors; we expose them read-only
  // here to keep the top-level UI tight, but show what's active.
  return (
    <div className="card">
      <div className="card-head">
        <h3>Pattern factors</h3>
        <span className="card-hint">Active: Pattern {pattern}</span>
      </div>
      <div className="card-body">
        <table className="factor-table">
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Circuit ×</th>
              <th>Overhead +</th>
              <th>SignalR ×</th>
              <th>Msg ×</th>
            </tr>
          </thead>
          <tbody>
            {['A', 'B', 'C'].map((k) => {
              const p = CORE.PATTERN_PROFILES[k];
              return (
                <tr key={k} className={k === pattern ? 'active' : ''}>
                  <td><strong>{k}</strong></td>
                  <td>{p.circuitFactor.toFixed(2)}</td>
                  <td>{(p.overheadAdd * 100).toFixed(0)}%</td>
                  <td>{p.signalrFactor.toFixed(2)}</td>
                  <td>{p.messageFactor.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Message budget callout ----------
function BudgetCallout({ r }) {
  if (r.status === 'good') {
    return (
      <div className="callout callout-good">
        <div className="callout-icon">✓</div>
        <div className="callout-body">
          <div className="callout-title">Message budget covered</div>
          <div className="callout-sub">
            {CORE.fmtCompact(r.includedMessages)} included vs. {CORE.fmtCompact(r.dailyMessages)} estimated daily · {CORE.fmtCompact(r.messageCoverage)} headroom.
          </div>
        </div>
      </div>
    );
  }
  if (r.status === 'warn') {
    return (
      <div className="callout callout-warn">
        <div className="callout-icon">!</div>
        <div className="callout-body">
          <div className="callout-title">Add {r.additionalUnitsForMessages} SignalR unit{r.additionalUnitsForMessages === 1 ? '' : 's'} to cover messages</div>
          <div className="callout-sub">
            Shortfall of {CORE.fmtCompact(-r.messageCoverage)} messages/day at current unit count.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="callout callout-bad">
      <div className="callout-icon">!</div>
      <div className="callout-body">
        <div className="callout-title">Message budget insufficient</div>
        <div className="callout-sub">
          {CORE.fmtCompact(-r.messageCoverage)} msg/day shortfall · needs {r.additionalUnitsForMessages} more units. Revisit tier or message rate.
        </div>
      </div>
    </div>
  );
}

// ---------- Saved plans panel ----------
function PlansPanel({ inputs, pattern, onLoad }) {
  const { plans, save, remove } = useSavedPlans();
  const [name, setName] = useState('');
  return (
    <div className="card">
      <div className="card-head">
        <h3>Saved plans</h3>
        <span className="card-hint">Local to this browser</span>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input
            className="field-input"
            style={{ flex: 1, padding: '6px 10px', fontSize: 13, border: '1px solid var(--ink-200)', borderRadius: 8, background: 'var(--paper)' }}
            placeholder="Name this scenario…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) { save(name.trim(), inputs, pattern); setName(''); }
            }}
          />
          <button
            className="btn btn-sm btn-green"
            disabled={!name.trim()}
            onClick={() => { if (name.trim()) { save(name.trim(), inputs, pattern); setName(''); } }}
          >
            Save
          </button>
        </div>
        {plans.length === 0 ? (
          <div className="plan-empty">No saved scenarios yet. Save a plan to compare later.</div>
        ) : (
          <div className="plan-list">
            {plans.map((pl) => (
              <div key={pl.id} className="plan-item">
                <div className="plan-meta">
                  <div className="plan-name">{pl.name}</div>
                  <div className="plan-detail">
                    Pattern {pl.pattern} · {CORE.fmtInt(pl.inputs.users)} users · {CORE.fmtNum(pl.inputs.perCircuitMB, 2)} MB/circuit
                  </div>
                </div>
                <div className="plan-actions">
                  <button className="btn btn-sm" onClick={() => onLoad(pl)}>Load</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => remove(pl.id)} aria-label="Delete plan">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Detailed metrics ----------
function DetailedMetrics({ r, pattern }) {
  const p = CORE.PATTERN_PROFILES[pattern];
  const rows = [
    ['Architecture pattern', `${p.label} · ${p.name}`],
    ['Concurrent users', CORE.fmtInt(r.users)],
    ['Active circuits', CORE.fmtInt(r.activeCircuits)],
    ['Disconnected circuits', CORE.fmtInt(r.disconnectedCircuits)],
    ['Total circuits', CORE.fmtInt(r.totalCircuits)],
    ['Circuit memory (GB)', CORE.fmtNum(r.circuitMemoryGB)],
    ['Total memory incl. overhead (GB)', CORE.fmtNum(r.totalBlazorMemoryGB)],
    ['App nodes (raw)', CORE.fmtNum(r.nodesRaw)],
    ['App nodes (with spare)', CORE.fmtInt(r.nodesWithSpare)],
    ['SignalR units (raw)', CORE.fmtNum(r.signalrUnitsRaw)],
    ['SignalR units (with headroom)', CORE.fmtInt(r.signalrUnits)],
    ['Daily messages estimate', CORE.fmtInt(r.dailyMessages)],
    ['Included messages / day', CORE.fmtInt(r.includedMessages)],
    ['Message coverage Δ', CORE.fmtInt(r.messageCoverage)],
    ['Extra units needed', CORE.fmtInt(r.additionalUnitsForMessages)],
  ];
  return (
    <table className="detail-table">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}><td>{k}</td><td className="num">{v}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Copy summary helper ----------
function buildSummary({ inputs, pattern, result: r }) {
  const p = CORE.PATTERN_PROFILES[pattern];
  return [
    'Blazor Server Capacity Plan Summary',
    `Pattern: ${p.label} (${p.name})`,
    `Peak users: ${CORE.fmtInt(r.users)}`,
    '',
    'Sizing:',
    `  • App nodes (with ${inputs.sparePct}% spare): ${r.nodesWithSpare}`,
    `  • SignalR units (with ${inputs.signalrHeadroom}% headroom): ${r.signalrUnits}`,
    `  • Blazor memory incl. overhead: ${CORE.fmtNum(r.totalBlazorMemoryGB)} GB`,
    `  • Active / total circuits: ${CORE.fmtInt(r.activeCircuits)} / ${CORE.fmtInt(r.totalCircuits)}`,
    '',
    'Message budget:',
    `  • Daily messages: ${CORE.fmtInt(r.dailyMessages)}`,
    `  • Included at recommended units: ${CORE.fmtInt(r.includedMessages)}`,
    `  • Status: ${r.status === 'good' ? 'Covered' : r.status === 'warn' ? `Add ${r.additionalUnitsForMessages} unit(s)` : 'Insufficient'}`,
    '',
    'Note: Planning estimates only. Validate with soak and failure testing.',
  ].join('\n');
}

export {
  useCalculator,
  useSavedPlans,
  AppHeader,
  PatternSelector,
  UserSlider,
  InputsCard,
  FactorEditor,
  BudgetCallout,
  PlansPanel,
  DetailedMetrics,
  buildSummary,
};
