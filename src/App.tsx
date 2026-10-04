import React, { useEffect, useState } from 'react';
import {
  WifiOff,
  Wifi,
  Droplets,
  ScanLine,
  MessageSquare,
  Settings2,
  LayoutDashboard,
  RotateCcw,
  ArrowUpRight,
  BookOpen,
} from 'lucide-react';
import {
  AutomationRule,
  CropDiagnosisResult,
  ExecutionLogEntry,
  FieldZone,
  INITIAL_AUTOMATION_RULES,
  INITIAL_FIELD_ZONES,
} from './data/agronomyData';
import { computeFAO56Evapotranspiration } from './services/localAgronomyEngine';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { PWAInstallButton } from './components/PWAInstallButton';
import { CropVisionScanner } from './components/CropVisionScanner';
import { IrrigationPredictor } from './components/IrrigationPredictor';
import { AgronomistAssistant } from './components/AgronomistAssistant';
import { AutomationHub } from './components/AutomationHub';
import { SystemGuide } from './components/SystemGuide';

type ActiveTab = 'telemetry' | 'vision' | 'irrigation' | 'agronomist' | 'automation' | 'guide';

export default function App() {
  const { isOnline, forceAirGap, toggleAirGap } = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<ActiveTab>('telemetry');

  const [zones, setZones] = useState<FieldZone[]>(() => {
    try {
      const saved = localStorage.getItem('terralocal_zones_v1');
      return saved ? JSON.parse(saved) : INITIAL_FIELD_ZONES;
    } catch {
      return INITIAL_FIELD_ZONES;
    }
  });

  const [activeZoneId, setActiveZoneId] = useState<string>(INITIAL_FIELD_ZONES[0].id);

  const [rules, setRules] = useState<AutomationRule[]>(() => {
    try {
      const saved = localStorage.getItem('terralocal_rules_v1');
      return saved ? JSON.parse(saved) : INITIAL_AUTOMATION_RULES;
    } catch {
      return INITIAL_AUTOMATION_RULES;
    }
  });

  const [closedLoopEnabled, setClosedLoopEnabled] = useState<boolean>(true);

  const [logs, setLogs] = useState<ExecutionLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('terralocal_logs_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'log-1',
        timestamp: 'Today, 11:40:12',
        zoneName: 'Sector B2 · High-Tunnel West',
        ruleName: 'High Tensiometer Matric Stress Emergency Valve',
        triggerReading: '64.2 kPa > 55.0 kPa',
        actionTaken: 'Opened Sub-Surface Drip Valve (Flow: 185 L/min)',
        mode: 'AUTO_CLOSED_LOOP',
      },
      {
        id: 'log-2',
        timestamp: 'Today, 06:14:05',
        zoneName: 'Sector A1 · North Terrace',
        ruleName: 'Root-Zone Depletion Sub-Surface Drip Trigger',
        triggerReading: '21.4% VWC < 22.0% VWC',
        actionTaken: 'Scheduled 90 min Precision Drip Cycle',
        mode: 'AUTO_CLOSED_LOOP',
      },
    ];
  });

  const [recentDiagnoses, setRecentDiagnoses] = useState<CropDiagnosisResult[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('terralocal_zones_v1', JSON.stringify(zones));
    } catch {
      // ignore
    }
  }, [zones]);

  useEffect(() => {
    try {
      localStorage.setItem('terralocal_rules_v1', JSON.stringify(rules));
    } catch {
      // ignore
    }
  }, [rules]);

  useEffect(() => {
    try {
      localStorage.setItem('terralocal_logs_v1', JSON.stringify(logs));
    } catch {
      // ignore
    }
  }, [logs]);

  const activeZone = zones.find((z) => z.id === activeZoneId) || zones[0];

  const handleUpdateZoneSlider = (
    zoneId: string,
    field: 'currentVwc' | 'soilTensionKpa' | 'nitrogenPpm' | 'canopyTempC',
    val: number
  ) => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        const updated = { ...z, [field]: val };
        if (updated.currentVwc <= updated.wiltingPointVwc + 4 || updated.soilTensionKpa > 58) {
          updated.status = 'CRITICAL';
        } else if (updated.currentVwc < updated.fieldCapacityVwc - 8 || updated.nitrogenPpm < 40) {
          updated.status = 'DRIFTING';
        } else {
          updated.status = 'NOMINAL';
        }
        return updated;
      })
    );
  };

  const handleToggleZoneValve = (zoneId: string) => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        const nextOpen = !z.valveOpen;
        const logEntry: ExecutionLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          zoneName: z.name,
          ruleName: 'Manual Operator Solenoid Override',
          triggerReading: `${z.currentVwc.toFixed(1)}% VWC`,
          actionTaken: nextOpen
            ? 'Opened Sub-Surface Drip Solenoid (180 L/min)'
            : 'Closed Sub-Surface Drip Solenoid',
          mode: 'MANUAL_OVERRIDE',
        };
        setLogs((l) => [logEntry, ...l.slice(0, 29)]);
        return {
          ...z,
          valveOpen: nextOpen,
          flowRateLpm: nextOpen ? 180 : 0,
          lastIrrigated: nextOpen ? 'Active Now' : 'Just now',
        };
      })
    );
  };

  const handleToggleZoneFertigation = (zoneId: string) => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        const nextActive = !z.fertigationActive;
        const logEntry: ExecutionLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          zoneName: z.name,
          ruleName: 'Manual Venturi NPK Dosing Override',
          triggerReading: `${z.nitrogenPpm} ppm NO3-N`,
          actionTaken: nextActive
            ? 'Engaged Venturi Nitrate Injector (+15 ppm target)'
            : 'Halted Venturi Nitrate Injector',
          mode: 'MANUAL_OVERRIDE',
        };
        setLogs((l) => [logEntry, ...l.slice(0, 29)]);
        return {
          ...z,
          fertigationActive: nextActive,
          nitrogenPpm: nextActive ? z.nitrogenPpm + 12 : z.nitrogenPpm,
        };
      })
    );
  };

  const handleTriggerIrrigationNow = (zoneId: string, durationMinutes: number, grossMm: number) => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        const nextVwc = Math.min(z.fieldCapacityVwc, Number((z.currentVwc + grossMm * 0.2).toFixed(1)));
        const nextTension = Math.max(15, Number((z.soilTensionKpa - grossMm * 1.4).toFixed(1)));
        const logEntry: ExecutionLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          zoneName: z.name,
          ruleName: 'FAO-56 Penman-Monteith Precision Refill',
          triggerReading: `Deficit ${grossMm} mm (${durationMinutes} min)`,
          actionTaken: `Applied ${grossMm} mm drip refill · VWC restored to ${nextVwc}%`,
          mode: 'AUTO_CLOSED_LOOP',
        };
        setLogs((l) => [logEntry, ...l.slice(0, 29)]);
        return {
          ...z,
          currentVwc: nextVwc,
          soilTensionKpa: nextTension,
          valveOpen: true,
          flowRateLpm: 195,
          status: 'NOMINAL',
          lastIrrigated: 'Active Now',
        };
      })
    );
  };

  const handleApplyAutomatedRemedy = (diag: CropDiagnosisResult) => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== diag.zoneId) return z;
        const isNitrogen = diag.conditionName.toLowerCase().includes('nitrogen');
        const logEntry: ExecutionLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          zoneName: z.name,
          ruleName: `Optical Vision Remedy: ${diag.conditionName.slice(0, 36)}`,
          triggerReading: `Chlorosis ${diag.spectralMetrics.chlorosisFraction}% · Necrosis ${diag.spectralMetrics.necrosisFraction}%`,
          actionTaken: isNitrogen
            ? 'Triggered Venturi UAN-32 Fertigation Pulse (+22 ppm NO3-N)'
            : 'Locked Out Overhead Misting & Engaged Sub-Surface Drip Only',
          mode: 'AUTO_CLOSED_LOOP',
        };
        setLogs((l) => [logEntry, ...l.slice(0, 29)]);
        return {
          ...z,
          fertigationActive: isNitrogen ? true : z.fertigationActive,
          nitrogenPpm: isNitrogen ? z.nitrogenPpm + 22 : z.nitrogenPpm,
          status: 'NOMINAL',
        };
      })
    );
  };

  const handleSimulateSensorDriftAndExecute = () => {
    const newLogs: ExecutionLogEntry[] = [];
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const nextZones = zones.map((z) => {
      // Simulate slight evapotranspiration drift
      let vwc = Number(Math.max(z.wiltingPointVwc, z.currentVwc - 0.8).toFixed(1));
      let tension = Number((z.soilTensionKpa + 2.1).toFixed(1));
      let valveOpen = z.valveOpen;
      let fertigationActive = z.fertigationActive;
      let flowRateLpm = z.flowRateLpm;

      if (closedLoopEnabled) {
        rules
          .filter((r) => r.enabled && r.zoneId === z.id)
          .forEach((rule) => {
            const val =
              rule.metric === 'currentVwc'
                ? vwc
                : rule.metric === 'soilTensionKpa'
                ? tension
                : rule.metric === 'canopyTempC'
                ? z.canopyTempC
                : rule.metric === 'nitrogenPpm'
                ? z.nitrogenPpm
                : z.ecDsM;

            const triggered =
              (rule.operator === '<' && val < rule.threshold) ||
              (rule.operator === '>' && val > rule.threshold) ||
              (rule.operator === '<=' && val <= rule.threshold) ||
              (rule.operator === '>=' && val >= rule.threshold);

            if (triggered) {
              if (rule.actionType === 'OPEN_IRRIGATION_VALVE') {
                valveOpen = true;
                flowRateLpm = 185;
                vwc = Number(Math.min(z.fieldCapacityVwc, vwc + 3.2).toFixed(1));
                tension = Number(Math.max(18, tension - 6.5).toFixed(1));
              } else if (rule.actionType === 'CLOSE_IRRIGATION_VALVE') {
                valveOpen = false;
                flowRateLpm = 0;
              } else if (rule.actionType === 'PULSE_FERTIGATION_INJECTOR') {
                fertigationActive = true;
              }

              newLogs.push({
                id: `log-${Date.now()}-${Math.random()}`,
                timestamp: nowStr,
                zoneName: z.name,
                ruleName: rule.name,
                triggerReading: `${val} ${rule.unit} ${rule.operator} ${rule.threshold} ${rule.unit}`,
                actionTaken: `Executed ${rule.actionType} (${rule.durationMinutes} min)`,
                mode: 'AUTO_CLOSED_LOOP',
              });
            }
          });
      }

      const status: FieldZone['status'] =
        vwc <= z.wiltingPointVwc + 4 || tension > 58
          ? 'CRITICAL'
          : vwc < z.fieldCapacityVwc - 8
          ? 'DRIFTING'
          : 'NOMINAL';

      return {
        ...z,
        currentVwc: vwc,
        soilTensionKpa: tension,
        valveOpen,
        fertigationActive,
        flowRateLpm,
        status,
      };
    });

    setZones(nextZones);
    if (newLogs.length > 0) {
      setLogs((prev) => [...newLogs, ...prev.slice(0, 25)]);
    }
  };

  const handleResetDemo = () => {
    setZones(INITIAL_FIELD_ZONES);
    setRules(INITIAL_AUTOMATION_RULES);
    localStorage.removeItem('terralocal_zones_v1');
    localStorage.removeItem('terralocal_rules_v1');
  };

  // Spider / Radar Chart Polygon Helper for Active Zone Soil & Canopy Health
  const renderRadarPolygon = (z: FieldZone) => {
    const cx = 110;
    const cy = 110;
    const rMax = 76;
    // 5 normalized axes (0.2 to 1.0): Moisture, Nitrate, Phosphorus, Potassium, NDVI
    const scores = [
      Math.min(1, Math.max(0.2, z.currentVwc / z.fieldCapacityVwc)),
      Math.min(1, Math.max(0.2, z.nitrogenPpm / 65)),
      Math.min(1, Math.max(0.2, z.phosphorusPpm / 45)),
      Math.min(1, Math.max(0.2, z.potassiumPpm / 200)),
      Math.min(1, Math.max(0.2, z.ndviScore)),
    ];
    const labels = ['VWC %', 'NO3-N', 'PHOS', 'POTAS', 'NDVI'];

    const points = scores
      .map((val, i) => {
        const angle = (Math.PI * 2 * i) / scores.length - Math.PI / 2;
        const x = cx + Math.cos(angle) * rMax * val;
        const y = cy + Math.sin(angle) * rMax * val;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg viewBox="0 0 220 220" className="w-full h-[195px] select-none">
        {[0.35, 0.65, 1.0].map((ring) => (
          <polygon
            key={ring}
            points={labels
              .map((_, i) => {
                const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
                return `${(cx + Math.cos(angle) * rMax * ring).toFixed(1)},${(
                  cy +
                  Math.sin(angle) * rMax * ring
                ).toFixed(1)}`;
              })
              .join(' ')}
            fill="none"
            stroke="#1E293B"
            strokeWidth="1"
          />
        ))}
        {labels.map((label, i) => {
          const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
          const x2 = cx + Math.cos(angle) * rMax;
          const y2 = cy + Math.sin(angle) * rMax;
          const lx = cx + Math.cos(angle) * (rMax + 18);
          const ly = cy + Math.sin(angle) * (rMax + 18);
          return (
            <g key={label}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#1E293B" strokeWidth="1" />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#94A3B8"
                fontSize="9.5"
                fontFamily="JetBrains Mono"
              >
                {label}
              </text>
            </g>
          );
        })}
        <polygon
          points={points}
          fill="rgba(16, 185, 129, 0.22)"
          stroke="#10B981"
          strokeWidth="2"
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-[#0B0F17]/95 sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('telemetry');
          }}
          className="text-lg font-display font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          TerraLocal AgOS
        </a>

        {/* Zone 2: 5 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'telemetry'
                ? 'text-emerald-400 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-100'
            }`}
          >
            Field Telemetry
          </button>
          <button
            onClick={() => setActiveTab('vision')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'vision'
                ? 'text-emerald-400 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-100'
            }`}
          >
            Crop Vision AI
          </button>
          <button
            onClick={() => setActiveTab('irrigation')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'irrigation'
                ? 'text-emerald-400 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-100'
            }`}
          >
            Irrigation Forecast
          </button>
          <button
            onClick={() => setActiveTab('agronomist')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'agronomist'
                ? 'text-emerald-400 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-100'
            }`}
          >
            Agronomist Q&amp;A
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'automation'
                ? 'text-emerald-400 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-100'
            }`}
          >
            Automation PLC
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'guide'
                ? 'text-emerald-400 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-100'
            }`}
          >
            System Guide
          </button>
        </nav>

        {/* Zone 3: 1-2 Primary Actions (Air-Gap Offline Toggle + PWA Install) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleAirGap}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !isOnline
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-emerald-400 hover:border-slate-700'
            }`}
            title="Toggle simulated offline field mode to verify 100% local edge AI operation without internet"
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>{forceAirGap ? 'AIR-GAPPED FIELD MODE' : 'OFFLINE EDGE MODE'}</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>EDGE LOCAL + SYNC</span>
              </>
            )}
          </button>

          <PWAInstallButton />
        </div>
      </header>

      {/* Mobile Navigation Selector Bar */}
      <div className="flex md:hidden items-center justify-between gap-1 px-4 py-2 bg-[#111827] border-b border-slate-800 overflow-x-auto">
        {[
          { id: 'telemetry', label: 'Telemetry', icon: LayoutDashboard },
          { id: 'vision', label: 'Leaf Vision', icon: ScanLine },
          { id: 'irrigation', label: 'Irrigation', icon: Droplets },
          { id: 'agronomist', label: 'Ask AI', icon: MessageSquare },
          { id: 'automation', label: 'Automation', icon: Settings2 },
          { id: 'guide', label: 'System Guide', icon: BookOpen },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === item.id
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Header Active Field Zone Selector & Telemetry Bar */}
      <div className="bg-[#111827]/70 border-b border-slate-800/80 px-6 py-2.5">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-mono text-slate-400 shrink-0">ACTIVE SECTOR:</span>
            <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-slate-800 rounded-md">
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setActiveZoneId(z.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeZone.id === z.id
                      ? 'bg-slate-800 text-slate-100 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{z.name.split('·')[0].trim()}</span>
                  <span className="mx-1.5 text-slate-600">·</span>
                  <span
                    className={`font-mono text-[11px] ${
                      z.status === 'CRITICAL'
                        ? 'text-rose-400'
                        : z.status === 'DRIFTING'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {z.currentVwc.toFixed(1)}% VWC
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>
              CROP: <strong className="text-slate-200">{activeZone.crop}</strong>
            </span>
            <span>·</span>
            <span>
              TENSION: <strong className="text-amber-400">{activeZone.soilTensionKpa.toFixed(1)} kPa</strong>
            </span>
            <span>·</span>
            <button
              onClick={handleResetDemo}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Reset field sensor calibration to defaults"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Sensors</span>
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('guide')}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
              title="View full interactive guide explaining every component and control"
            >
              <BookOpen className="w-3 h-3" />
              <span>How Controls Work</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Workspace (1440px Container) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            {/* Top Executive Telemetry Overview Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {zones.map((z) => {
                const { etc } = computeFAO56Evapotranspiration(
                  z.ambientTempC,
                  z.relativeHumidity,
                  z.windSpeedMs,
                  z.solarRadiationMj,
                  z.kc
                );
                const isSelected = z.id === activeZone.id;
                return (
                  <div
                    key={z.id}
                    onClick={() => setActiveZoneId(z.id)}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#111827] border-emerald-500/70'
                        : 'bg-[#111827]/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">{z.name}</span>
                      {z.status === 'NOMINAL' && (
                        <span className="text-emerald-400 font-semibold">● NOMINAL</span>
                      )}
                      {z.status === 'DRIFTING' && (
                        <span className="text-amber-400 font-semibold">▲ DRIFTING</span>
                      )}
                      {z.status === 'CRITICAL' && (
                        <span className="text-rose-400 font-semibold">✖ CRITICAL</span>
                      )}
                    </div>

                    <div className="mt-1.5 text-sm font-semibold text-slate-100 truncate">
                      {z.crop}
                    </div>
                    <div className="text-xs text-slate-400">
                      {z.growthStage} · {z.areaHectares} ha · {z.soilType}
                    </div>

                    {/* Primary Quantitative Readout */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400">SOIL VWC</div>
                        <div className="mt-0.5 flex items-baseline">
                          <span className="text-lg font-bold text-slate-100 tabular-nums">
                            {z.currentVwc.toFixed(1)}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-0.5">%</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400">TENSION</div>
                        <div className="mt-0.5 flex items-baseline">
                          <span className="text-lg font-bold text-amber-400 tabular-nums">
                            {z.soilTensionKpa.toFixed(0)}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-0.5">kPa</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400">DAILY ETc</div>
                        <div className="mt-0.5 flex items-baseline">
                          <span className="text-lg font-bold text-cyan-400 tabular-nums">
                            {etc.toFixed(1)}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-0.5">mm</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>
                        Valve: <strong className={z.valveOpen ? 'text-cyan-400' : 'text-slate-400'}>{z.valveOpen ? `OPEN (${z.flowRateLpm} L/m)` : 'CLOSED'}</strong>
                      </span>
                      <span>NDVI: {z.ndviScore.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Middle Split Console: Interactive Sensor Simulator + Radar Calibration + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 4 Columns: Live Sensor Scrubber & Calibration */}
              <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="pb-3 border-b border-slate-800">
                    <h2 className="text-base font-display font-semibold text-slate-100">
                      Interactive Field Probe Telemetry ({activeZone.name.split('·')[0].trim()})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adjust local LoRaWAN probe values to test real-time irrigation &amp; PLC triggers.
                    </p>
                  </div>

                  {/* VWC Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Volumetric Soil Moisture (VWC)</span>
                      <span className="font-mono font-semibold text-cyan-400 tabular-nums">
                        {activeZone.currentVwc.toFixed(1)} %
                      </span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={40}
                      step={0.5}
                      value={activeZone.currentVwc}
                      onChange={(e) =>
                        handleUpdateZoneSlider(activeZone.id, 'currentVwc', parseFloat(e.target.value))
                      }
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Soil Matric Tension Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Soil Tensiometer Matric Potential</span>
                      <span className="font-mono font-semibold text-amber-400 tabular-nums">
                        {activeZone.soilTensionKpa.toFixed(1)} kPa
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={85}
                      step={1}
                      value={activeZone.soilTensionKpa}
                      onChange={(e) =>
                        handleUpdateZoneSlider(activeZone.id, 'soilTensionKpa', parseFloat(e.target.value))
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Soil Nitrate Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Root-Zone Nitrate (NO3-N)</span>
                      <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                        {activeZone.nitrogenPpm} ppm
                      </span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={90}
                      step={2}
                      value={activeZone.nitrogenPpm}
                      onChange={(e) =>
                        handleUpdateZoneSlider(activeZone.id, 'nitrogenPpm', parseFloat(e.target.value))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  {/* Canopy Temp Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Infrared Canopy Temperature</span>
                      <span className="font-mono font-semibold text-rose-400 tabular-nums">
                        {activeZone.canopyTempC.toFixed(1)} °C
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={42}
                      step={0.5}
                      value={activeZone.canopyTempC}
                      onChange={(e) =>
                        handleUpdateZoneSlider(activeZone.id, 'canopyTempC', parseFloat(e.target.value))
                      }
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => handleToggleZoneValve(activeZone.id)}
                    className={`flex-1 py-2 px-3 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      activeZone.valveOpen
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {activeZone.valveOpen ? 'Close Drip Valve' : 'Open Drip Valve'}
                  </button>
                  <button
                    onClick={handleSimulateSensorDriftAndExecute}
                    className="py-2 px-3 rounded text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
                  >
                    Run Local PLC
                  </button>
                </div>
              </div>

              {/* Center 4 Columns: Multi-Axis Radar Balance & NPK Matrix */}
              <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-base font-display font-semibold text-slate-100">
                      Agronomic Equilibrium Radar
                    </h3>
                    <span className="text-xs font-mono text-emerald-400">
                      NDVI {activeZone.ndviScore.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2">{renderRadarPolygon(activeZone)}</div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 font-mono text-xs">
                  <div className="p-2 rounded bg-[#0B0F17] border border-slate-800">
                    <div className="text-[10px] text-slate-400">SOIL pH</div>
                    <div className="text-sm font-semibold text-slate-100 mt-0.5 tabular-nums">
                      {activeZone.soilPh.toFixed(1)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#0B0F17] border border-slate-800">
                    <div className="text-[10px] text-slate-400">SALINITY EC</div>
                    <div className="text-sm font-semibold text-cyan-400 mt-0.5 tabular-nums">
                      {activeZone.ecDsM.toFixed(2)} dS/m
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#0B0F17] border border-slate-800">
                    <div className="text-[10px] text-slate-400">NPK (ppm)</div>
                    <div className="text-sm font-semibold text-emerald-400 mt-0.5 tabular-nums">
                      {activeZone.nitrogenPpm}/{activeZone.phosphorusPpm}/{activeZone.potassiumPpm}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 4 Columns: Direct Launch Cards to Local AI Subsystems */}
              <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-3">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-base font-display font-semibold text-slate-100">
                    On-Device Agricultural AI Suite
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Zero-latency inference modules operating without internet connectivity.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('vision')}
                  className="w-full text-left p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 hover:border-emerald-500/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400">
                      01. Optical Leaf Pathology &amp; VARI Scanner
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Quantify leaf chlorosis %, necrotic target lesions, and trigger automated NPK or bio-fungicide remedies.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('irrigation')}
                  className="w-full text-left p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 hover:border-cyan-500/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan-400">
                      02. FAO-56 Penman-Monteith Irrigation Predictor
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    7-day root-zone VWC depletion trajectory, Vapor Pressure Deficit (kPa), and exact drip valve runtimes.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('agronomist')}
                  className="w-full text-left p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 hover:border-amber-500/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-400">
                      03. Offline Agronomist Knowledge Base Q&amp;A
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Ask natural-language farming questions grounded in live sensor telemetry and local agronomic protocols.
                  </p>
                </button>
                <button
                  onClick={() => setActiveTab('guide')}
                  className="w-full text-left p-3 rounded-lg bg-emerald-950/25 border border-emerald-500/40 hover:border-emerald-400 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>04. Interactive System &amp; Control Guide</span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    See exact cause-and-effect documentation for every slider, leaf specimen preset, and PLC rule.
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vision' && (
          <CropVisionScanner
            activeZone={activeZone}
            isOnline={isOnline}
            onDiagnosisComplete={(res) =>
              setRecentDiagnoses((prev) => [res, ...prev.slice(0, 4)])
            }
            onApplyAutomatedRemedy={handleApplyAutomatedRemedy}
          />
        )}

        {activeTab === 'irrigation' && (
          <IrrigationPredictor
            activeZone={activeZone}
            onTriggerIrrigationNow={handleTriggerIrrigationNow}
          />
        )}

        {activeTab === 'agronomist' && (
          <AgronomistAssistant
            zones={zones}
            activeZoneId={activeZone.id}
            isOnline={isOnline}
          />
        )}

        {activeTab === 'automation' && (
          <AutomationHub
            zones={zones}
            rules={rules}
            logs={logs}
            closedLoopEnabled={closedLoopEnabled}
            onToggleClosedLoop={() => setClosedLoopEnabled((prev) => !prev)}
            onToggleZoneValve={handleToggleZoneValve}
            onToggleZoneFertigation={handleToggleZoneFertigation}
            onToggleRule={(ruleId) =>
              setRules((prev) =>
                prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
              )
            }
            onAddRule={(newRule) => setRules((prev) => [newRule, ...prev])}
            onSimulateSensorDriftAndExecute={handleSimulateSensorDriftAndExecute}
          />
        )}

        {activeTab === 'guide' && (
          <SystemGuide
            onNavigateToModule={(tab) => setActiveTab(tab)}
          />
        )}
      </main>

      {/* Quiet Footer with Offline Verification & Recent Scans */}
      <footer className="border-t border-slate-800/80 px-6 py-4 mt-8 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            TerraLocal AgOS · Offline-First Edge Agricultural Intelligence &amp; Closed-Loop Field Automation
          </div>
          <div className="flex items-center gap-4 font-mono">
            {recentDiagnoses.length > 0 && (
              <span className="text-slate-400">
                Latest Leaf Scan: {recentDiagnoses[0].conditionName.slice(0, 32)} ({recentDiagnoses[0].confidencePct}%)
              </span>
            )}
            <span>PWA Service Worker Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
