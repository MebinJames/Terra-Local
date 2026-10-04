import React, { useState } from 'react';
import { Power, Plus, Activity, ShieldCheck, Zap, PlayCircle } from 'lucide-react';
import {
  AutomationRule,
  ExecutionLogEntry,
  FieldZone,
} from '../data/agronomyData';

interface AutomationHubProps {
  zones: FieldZone[];
  rules: AutomationRule[];
  logs: ExecutionLogEntry[];
  closedLoopEnabled: boolean;
  onToggleClosedLoop: () => void;
  onToggleZoneValve: (zoneId: string) => void;
  onToggleZoneFertigation: (zoneId: string) => void;
  onToggleRule: (ruleId: string) => void;
  onAddRule: (rule: AutomationRule) => void;
  onSimulateSensorDriftAndExecute: () => void;
}

export const AutomationHub: React.FC<AutomationHubProps> = ({
  zones,
  rules,
  logs,
  closedLoopEnabled,
  onToggleClosedLoop,
  onToggleZoneValve,
  onToggleZoneFertigation,
  onToggleRule,
  onAddRule,
  onSimulateSensorDriftAndExecute,
}) => {
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleZoneId, setNewRuleZoneId] = useState(zones[0]?.id || 'zone-a1');
  const [newRuleMetric, setNewRuleMetric] = useState<AutomationRule['metric']>('currentVwc');
  const [newRuleOperator, setNewRuleOperator] = useState<AutomationRule['operator']>('<');
  const [newRuleThreshold, setNewRuleThreshold] = useState('20.0');
  const [newRuleAction, setNewRuleAction] = useState<AutomationRule['actionType']>('OPEN_IRRIGATION_VALVE');
  const [newRuleDuration, setNewRuleDuration] = useState('60');

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const unitMap: Record<AutomationRule['metric'], string> = {
      currentVwc: '% VWC',
      soilTensionKpa: 'kPa',
      canopyTempC: '°C',
      ecDsM: 'dS/m',
      nitrogenPpm: 'ppm NO3-N',
    };

    const created: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName.trim(),
      zoneId: newRuleZoneId,
      metric: newRuleMetric,
      operator: newRuleOperator,
      threshold: parseFloat(newRuleThreshold) || 20,
      unit: unitMap[newRuleMetric],
      actionType: newRuleAction,
      durationMinutes: parseInt(newRuleDuration, 10) || 45,
      enabled: true,
      lastTriggered: 'Armed (Local PLC)',
      triggerCount: 0,
    };

    onAddRule(created);
    setNewRuleName('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-display font-semibold text-slate-100">
              Autonomous Field PLC & Solenoid Valve Controller
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Evaluates real-time soil moisture tension, VWC %, nitrate ppm, and canopy temperature locally via RS-485 / LoRaWAN edge bus without internet access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSimulateSensorDriftAndExecute}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Step Telemetry & Evaluate Rules Now</span>
          </button>

          <button
            onClick={onToggleClosedLoop}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              closedLoopEnabled
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>
              {closedLoopEnabled
                ? 'Closed-Loop AI Automation: ARMED'
                : 'Closed-Loop AI Automation: MANUAL ONLY'}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {zones.map((z) => (
          <div
            key={z.id}
            className="bg-[#111827] border border-slate-800 rounded-lg p-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>{z.name.split('·')[0]}</span>
                <span
                  className={
                    z.valveOpen || z.fertigationActive ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                  }
                >
                  {z.valveOpen ? `● FLOW ${z.flowRateLpm} L/m` : '○ STANDBY'}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mt-1 truncate">{z.crop}</h3>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono bg-[#0B0F17] p-2.5 rounded border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400">MOISTURE</div>
                  <div className="text-slate-100 font-semibold tabular-nums">{z.currentVwc.toFixed(1)}% VWC</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">NITRATE</div>
                  <div className="text-slate-100 font-semibold tabular-nums">{z.nitrogenPpm} ppm</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => onToggleZoneValve(z.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  z.valveOpen
                    ? 'bg-cyan-500/20 border border-cyan-500/60 text-cyan-300'
                    : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300'
                }`}
              >
                <span>Sub-Surface Drip Valve</span>
                <span className="font-mono font-semibold">{z.valveOpen ? 'OPEN' : 'CLOSED'}</span>
              </button>

              <button
                onClick={() => onToggleZoneFertigation(z.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  z.fertigationActive
                    ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300'
                }`}
              >
                <span>Venturi NPK Injector</span>
                <span className="font-mono font-semibold">
                  {z.fertigationActive ? 'DOSING' : 'IDLE'}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-lg p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-display font-semibold text-slate-100">
              Deterministic Sensor-to-Actuator Rules
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {rules.filter((r) => r.enabled).length} of {rules.length} Active
            </span>
          </div>

          <div className="space-y-2.5">
            {rules.map((rule) => {
              const zoneName = zones.find((z) => z.id === rule.zoneId)?.name || rule.zoneId;
              return (
                <div
                  key={rule.id}
                  className="p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-100">{rule.name}</span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-cyan-400">{zoneName.split('·')[0]}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      IF <strong className="text-slate-200">{rule.metric}</strong> {rule.operator}{' '}
                      <strong className="text-amber-400">
                        {rule.threshold} {rule.unit}
                      </strong>{' '}
                      &rarr; <strong className="text-emerald-400">{rule.actionType}</strong> (
                      {rule.durationMinutes} min)
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-[11px] font-mono text-slate-400">
                      <div>Triggers: {rule.triggerCount}</div>
                      <div>{rule.lastTriggered || 'Standby'}</div>
                    </div>
                    <button
                      onClick={() => onToggleRule(rule.id)}
                      className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                        rule.enabled
                          ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {rule.enabled ? 'ENABLED' : 'MUTED'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleCreateRule}
            className="pt-4 border-t border-slate-800 space-y-3"
          >
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Custom Local Automation Rule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="Rule name (e.g. Frost Guard Mist)"
                className="bg-[#0B0F17] border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100"
              />
              <select
                value={newRuleZoneId}
                onChange={(e) => setNewRuleZoneId(e.target.value)}
                className="bg-[#0B0F17] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
              <select
                value={newRuleMetric}
                onChange={(e) => setNewRuleMetric(e.target.value as AutomationRule['metric'])}
                className="bg-[#0B0F17] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="currentVwc">Volumetric Water (% VWC)</option>
                <option value="soilTensionKpa">Soil Tension (kPa)</option>
                <option value="canopyTempC">Canopy Temp (°C)</option>
                <option value="nitrogenPpm">Soil Nitrate (ppm)</option>
                <option value="ecDsM">Salinity EC (dS/m)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <select
                value={newRuleOperator}
                onChange={(e) => setNewRuleOperator(e.target.value as AutomationRule['operator'])}
                className="bg-[#0B0F17] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
              >
                <option value="<">&lt; (Below)</option>
                <option value=">">&gt; (Above)</option>
                <option value="<=">&le; (At or Below)</option>
                <option value=">=">&ge; (At or Above)</option>
              </select>
              <input
                type="number"
                step="0.5"
                value={newRuleThreshold}
                onChange={(e) => setNewRuleThreshold(e.target.value)}
                placeholder="Threshold"
                className="bg-[#0B0F17] border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 font-mono"
              />
              <input
                type="number"
                step="5"
                value={newRuleDuration}
                onChange={(e) => setNewRuleDuration(e.target.value)}
                placeholder="Duration (min)"
                className="bg-[#0B0F17] border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 font-mono"
              />
              <select
                value={newRuleAction}
                onChange={(e) => setNewRuleAction(e.target.value as AutomationRule['actionType'])}
                className="bg-[#0B0F17] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="OPEN_IRRIGATION_VALVE">Open Drip Valve</option>
                <option value="PULSE_FERTIGATION_INJECTOR">Pulse NPK Injector</option>
                <option value="ACTIVATE_MIST_COOLING">Canopy Mist Cooling</option>
                <option value="CLOSE_IRRIGATION_VALVE">Close Drip Valve</option>
              </select>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded px-3 py-1.5 transition-colors cursor-pointer"
              >
                Save Rule
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-display font-semibold text-slate-100">
                  Real-Time Actuator Execution Log
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400">● LOCAL NVRAM</span>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded bg-[#0B0F17] border border-slate-800 text-xs font-mono space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-cyan-400">{entry.zoneName.split('·')[0]}</span>
                    <span>{entry.timestamp}</span>
                  </div>
                  <div className="text-slate-200 font-sans font-medium">{entry.actionTaken}</div>
                  <div className="text-[11px] text-slate-400">
                    Rule: {entry.ruleName} ({entry.triggerReading})
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>All actuator events persisted to browser local storage</span>
            </span>
            <span className="font-mono">{logs.length} events</span>
          </div>
        </div>
      </div>
    </div>
  );
};
