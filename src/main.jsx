// App shell: tabbed layout (Calculator / Readme / Glossary) and root render.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import CORE from './calc-core.js';
import { KpiTile, ScenarioTable, ScalingChart } from './fields.jsx';
import {
  useCalculator,
  AppHeader,
  PatternSelector,
  UserSlider,
  InputsCard,
  FactorEditor,
  BudgetCallout,
  DetailedMetrics,
  buildSummary,
} from './panels.jsx';
import { ReadmePanel, GlossaryPanel, PlansPanelPro } from './extras.jsx';
import './styles.css';

function CalculatorView({ state }) {
  const { inputs, setInputs, pattern, setPattern, result, setField } = state;
  const onLoadPlan = (pl) => { setInputs(pl.inputs); setPattern(pl.pattern); };

  return (
    <div className="tab-wrap">
      <section className="va-hero card">
        <div className="va-hero-inner">
          <div className="va-hero-left">
            <div className="eyebrow">Architecture pattern</div>
            <PatternSelector pattern={pattern} setPattern={setPattern} />
          </div>
          <div className="va-hero-mid">
            <UserSlider value={inputs.users} onChange={(v) => setField('users', v)} />
          </div>
          <div className="va-hero-right">
            <div className="va-kpi-stack">
              <KpiTile big label="App nodes" value={result.nodesWithSpare}
                sub={`raw ${CORE.fmtNum(result.nodesRaw, 2)} · +${inputs.sparePct}% spare`} tone="good" />
              <KpiTile label="SignalR units" value={result.signalrUnits}
                sub={`+${inputs.signalrHeadroom}% headroom`} />
            </div>
          </div>
        </div>
      </section>

      <div className="va-callout-row"><BudgetCallout r={result} /></div>

      <section className="va-kpis">
        <KpiTile label="Active circuits" value={CORE.fmtInt(result.activeCircuits)} sub={`users × ${inputs.tabs} tabs`} />
        <KpiTile label="Total circuits" value={CORE.fmtInt(result.totalCircuits)} sub={`+${inputs.discRatio}% disconnected`} />
        <KpiTile label="Blazor memory" value={CORE.fmtNum(result.totalBlazorMemoryGB, 1)} sub={`GB incl. ${inputs.overheadPct}% overhead`} />
        <KpiTile label="Daily messages" value={CORE.fmtCompact(result.dailyMessages)} sub={`of ${CORE.fmtCompact(result.includedMessages)} included`} />
      </section>

      <div className="va-grid">
        <div className="va-col va-col-left">
          <InputsCard inputs={inputs} setField={setField} />
          <FactorEditor pattern={pattern} />
        </div>
        <div className="va-col va-col-mid">
          <div className="card">
            <div className="card-head">
              <h3>Scaling curve</h3>
              <span className="card-hint">Users → app nodes, SignalR units, memory</span>
            </div>
            <div className="card-body">
              <ScalingChart inputs={inputs} patternKey={pattern} highlightUsers={inputs.users} />
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <h3>Scenario comparison</h3>
              <span className="card-hint">1k · 5k · 8k · 10k · 15k · 25k</span>
            </div>
            <ScenarioTable inputs={inputs} patternKey={pattern} highlight={inputs.users} />
          </div>
          <div className="card">
            <div className="card-head">
              <h3>Detailed metrics</h3>
              <span className="card-hint">Current scenario</span>
            </div>
            <div className="card-body">
              <DetailedMetrics r={result} pattern={pattern} />
            </div>
          </div>
        </div>
        <div className="va-col va-col-right">
          <PlansPanelPro inputs={inputs} pattern={pattern} onLoad={onLoadPlan} />
        </div>
      </div>
    </div>
  );
}

function App() {
  const state = useCalculator();
  const [tab, setTab] = useState('calc');

  const onCopy = () => {
    const summary = buildSummary({ inputs: state.inputs, pattern: state.pattern, result: state.result });
    navigator.clipboard?.writeText(summary);
  };
  const onPrint = () => window.print();

  return (
    <div className="va-root">
      <AppHeader onPrint={onPrint} onCopy={onCopy} onReset={state.reset} />

      <div className="app-tabs no-print">
        <button className={`app-tab${tab === 'calc' ? ' active' : ''}`} onClick={() => setTab('calc')}>Calculator</button>
        <button className={`app-tab${tab === 'readme' ? ' active' : ''}`} onClick={() => setTab('readme')}>Readme</button>
        <button className={`app-tab${tab === 'glossary' ? ' active' : ''}`} onClick={() => setTab('glossary')}>Glossary &amp; references</button>
      </div>

      {tab === 'calc' ? <CalculatorView state={state} /> : null}
      {tab === 'readme' ? <ReadmePanel /> : null}
      {tab === 'glossary' ? <GlossaryPanel /> : null}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
