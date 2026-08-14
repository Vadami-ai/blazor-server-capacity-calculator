// Readme, Glossary, and Plans panel with JSON import/export.
import { useState as useStateX, useRef as useRefX } from 'react';
import CORE from './calc-core.js';
import { useSavedPlans } from './panels.jsx';

// ---------- Readme panel ----------
function ReadmePanel() {
  return (
    <div className="card">
      <div className="card-head">
        <h3>About this calculator</h3>
        <span className="card-hint">How to use it</span>
      </div>
      <div className="card-body readme">
        <p>
          A planning tool for sizing real-time Blazor Server workloads. It estimates
          app node count, SignalR unit count, memory pressure, and daily message-budget
          coverage from a handful of workload assumptions.
        </p>
        <ul className="readme-list">
          <li><strong>Pattern:</strong> pick the architecture pattern that matches your deployment. Each pattern applies factors to circuit memory, overhead, and SignalR headroom.</li>
          <li><strong>Slider:</strong> drag to set peak concurrent users. Everything recalculates live. Use the tick buttons for quick presets (1k / 5k / 8k / 10k / 15k / 25k).</li>
          <li><strong>Assumptions:</strong> edit the numbers on the left to reflect your app. Values come from soak tests, telemetry, and SKU documentation, not from defaults.</li>
          <li><strong>Scaling curve:</strong> see how nodes, SignalR units, and memory scale with user count. Hover to inspect any point.</li>
          <li><strong>Scenarios:</strong> the comparison table renders six preset user counts at once, with the current slider value highlighted.</li>
          <li><strong>Plans:</strong> save named snapshots locally, export to JSON for sharing, or import a JSON file from a teammate.</li>
        </ul>
        <div className="readme-note">
          Results are planning estimates. Always validate with soak tests and failure
          testing before procurement or go-live decisions.
        </div>
      </div>
    </div>
  );
}

// ---------- Glossary ----------
const GLOSSARY = [
  {
    term: 'Circuit',
    def: 'A persistent server-side connection that holds UI state for one user tab. Blazor Server keeps this alive while the user is connected; a short reconnect window retains it in memory after disconnect.',
    formula: null,
  },
  {
    term: 'Active circuits',
    def: 'Currently-connected circuits, one per open tab per user.',
    formula: 'active = users × tabs',
  },
  {
    term: 'Disconnected circuits',
    def: 'Circuits retained in memory during the reconnect grace period after brief network churn or node drains.',
    formula: 'disconnected = active × disconnectedRatio',
  },
  {
    term: 'Total circuits',
    def: 'All circuits consuming memory at peak: active plus those in the reconnect buffer.',
    formula: 'total = active + disconnected',
  },
  {
    term: 'Circuit memory',
    def: 'Raw memory cost from circuit state alone, before framework and app overhead.',
    formula: 'circuitMemGB = total × perCircuitMB ÷ 1024',
  },
  {
    term: 'Total Blazor memory',
    def: 'Circuit memory plus overhead for runtime, framework, app services, caches, and allocations.',
    formula: 'totalMemGB = circuitMemGB × (1 + overhead)',
  },
  {
    term: 'App nodes (with spare)',
    def: 'Recommended node count after reserving spare capacity for failover, deploys, and incidents.',
    formula: 'nodes = ceil(rawNodes ÷ (1 − sparePct))',
  },
  {
    term: 'SignalR unit',
    def: 'A unit of Azure SignalR Service capacity; it limits concurrent connections and includes a daily message allotment.',
    formula: null,
  },
  {
    term: 'SignalR units (with headroom)',
    def: 'Unit count after adding headroom above raw connection demand for reconnect bursts.',
    formula: 'units = ceil(rawUnits × (1 + headroom))',
  },
  {
    term: 'Daily messages',
    def: 'Estimated real-time messages per day across all users.',
    formula: 'daily = users × msgPerUserMin × activeMinDay',
  },
  {
    term: 'Included messages',
    def: 'Daily message quota included at the recommended SignalR unit count for your tier.',
    formula: 'included = units × includedPerUnitDay',
  },
  {
    term: 'Message coverage Δ',
    def: 'Included minus estimated daily messages. Negative means the message budget is insufficient at the current unit count.',
    formula: 'Δ = included − daily',
  },
  {
    term: 'Pattern factors',
    def: 'Multipliers / additions applied to baseline assumptions for a given architecture pattern. Pattern A is baseline; B adds memory pressure; C reduces interactive load via async offload.',
    formula: null,
  },
];

const REFERENCES = [
  {
    label: 'Blazor Server hosting & scalability',
    href: 'https://learn.microsoft.com/aspnet/core/blazor/host-and-deploy/server',
    note: 'Official guidance on circuit memory, scaling limits, and reverse-proxy considerations.',
  },
  {
    label: 'Azure SignalR Service sizing',
    href: 'https://learn.microsoft.com/azure/azure-signalr/signalr-concept-performance',
    note: 'Connection limits and included message allotments per unit across SKUs.',
  },
  {
    label: 'Blazor Server threat model & circuit lifecycle',
    href: 'https://learn.microsoft.com/aspnet/core/blazor/security/server/threat-mitigation',
    note: 'Connection lifecycle, reconnect behaviour, and server-side state implications.',
  },
  {
    label: '.NET memory & GC behaviour (Server GC)',
    href: 'https://learn.microsoft.com/dotnet/standard/garbage-collection/fundamentals',
    note: 'How the runtime manages memory; useful context for the overhead percentage.',
  },
];

function GlossaryPanel() {
  const [q, setQ] = useStateX('');
  const filtered = GLOSSARY.filter((g) =>
    !q.trim() ||
    g.term.toLowerCase().includes(q.toLowerCase()) ||
    g.def.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="card">
      <div className="card-head">
        <h3>Glossary &amp; formulas</h3>
        <span className="card-hint">{GLOSSARY.length} terms</span>
      </div>
      <div className="card-body">
        <input
          className="glossary-search"
          type="text"
          placeholder="Search terms…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="glossary-grid">
          {filtered.map((g) => (
            <div key={g.term} className="glossary-item">
              <div className="g-term">{g.term}</div>
              <div className="g-def">{g.def}</div>
              {g.formula ? <div className="g-formula mono">{g.formula}</div> : null}
            </div>
          ))}
          {filtered.length === 0 ? <div className="plan-empty">No matches.</div> : null}
        </div>
        <div className="glossary-refs">
          <div className="eyebrow" style={{ marginBottom: 8 }}>References</div>
          <ul className="ref-list">
            {REFERENCES.map((r) => (
              <li key={r.href}>
                <a href={r.href} target="_blank" rel="noreferrer">{r.label}</a>
                <div className="ref-note">{r.note}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------- Plans panel w/ JSON import/export ----------
function PlansPanelPro({ inputs, pattern, onLoad }) {
  const { plans, save, remove } = useSavedPlans();
  const [name, setName] = useStateX('');
  const fileRef = useRefX(null);

  const exportJson = () => {
    const data = { kind: 'blazor-capacity-plans', version: 1, plans };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blazor-capacity-plans-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onPickFile = () => fileRef.current?.click();

  const onImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || '{}'));
        const incoming = Array.isArray(data.plans) ? data.plans : (Array.isArray(data) ? data : []);
        incoming.forEach((p) => {
          if (p && p.inputs && p.pattern) {
            save(p.name || 'Imported plan', p.inputs, p.pattern);
          }
        });
      } catch {
        alert('Could not read plans JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3>Saved plans</h3>
        <span className="card-hint">Local · {plans.length}</span>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input
            style={{ flex: 1, padding: '6px 10px', fontSize: 13, border: '1px solid var(--ink-200)', borderRadius: 8, background: 'var(--paper)', outline: 'none' }}
            placeholder="Name this scenario…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { save(name.trim(), inputs, pattern); setName(''); } }}
          />
          <button className="btn btn-sm btn-green" disabled={!name.trim()} onClick={() => { if (name.trim()) { save(name.trim(), inputs, pattern); setName(''); } }}>
            Save
          </button>
        </div>
        <div className="plan-io">
          <button className="btn btn-sm" onClick={exportJson} disabled={plans.length === 0}>Export JSON</button>
          <button className="btn btn-sm" onClick={onPickFile}>Import JSON</button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={onImportFile} />
        </div>
        {plans.length === 0 ? (
          <div className="plan-empty" style={{ marginTop: 10 }}>No saved scenarios yet.</div>
        ) : (
          <div className="plan-list" style={{ marginTop: 10 }}>
            {plans.map((pl) => (
              <div key={pl.id} className="plan-item">
                <div className="plan-meta">
                  <div className="plan-name">{pl.name}</div>
                  <div className="plan-detail">
                    Pattern {pl.pattern} · {CORE.fmtInt(pl.inputs.users)} users · {CORE.fmtNum(pl.inputs.perCircuitMB, 2)} MB/circ
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

export { ReadmePanel, GlossaryPanel, PlansPanelPro };
