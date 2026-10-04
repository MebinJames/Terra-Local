import React, { useMemo, useState } from 'react';
import { Droplets, Play, Sliders, CloudRain, Thermometer } from 'lucide-react';
import { FieldZone } from '../data/agronomyData';
import {
  computeFAO56Evapotranspiration,
  generate7DayIrrigationSchedule,
} from '../services/localAgronomyEngine';

interface IrrigationPredictorProps {
  activeZone: FieldZone;
  onTriggerIrrigationNow: (zoneId: string, durationMinutes: number, grossMm: number) => void;
}

export const IrrigationPredictor: React.FC<IrrigationPredictorProps> = ({
  activeZone,
  onTriggerIrrigationNow,
}) => {
  const [tempDeltaC, setTempDeltaC] = useState<number>(0);
  const [simulatedRainDay3Mm, setSimulatedRainDay3Mm] = useState<number>(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [dispatchedNotice, setDispatchedNotice] = useState<string | null>(null);

  const liveMetrics = useMemo(
    () =>
      computeFAO56Evapotranspiration(
        activeZone.ambientTempC + tempDeltaC,
        activeZone.relativeHumidity,
        activeZone.windSpeedMs,
        activeZone.solarRadiationMj,
        activeZone.kc
      ),
    [activeZone, tempDeltaC]
  );

  const schedule = useMemo(
    () => generate7DayIrrigationSchedule(activeZone, tempDeltaC, simulatedRainDay3Mm),
    [activeZone, tempDeltaC, simulatedRainDay3Mm]
  );

  const madThresholdVwc = Number(
    (
      activeZone.wiltingPointVwc +
      (activeZone.fieldCapacityVwc - activeZone.wiltingPointVwc) * 0.55
    ).toFixed(1)
  );

  const totalWeeklyWaterSavedM3 = useMemo(() => {
    // Compare precision FAO-56 ETc scheduling vs fixed timer irrigation (35mm/week)
    const scheduledMm = schedule.reduce((acc, d) => acc + d.recommendedGrossIrrigationMm, 0);
    const baselineTimerMm = 48.0;
    const savedMm = Math.max(4.5, baselineTimerMm - scheduledMm * 0.65);
    return Math.round(savedMm * 10 * activeZone.areaHectares);
  }, [schedule, activeZone.areaHectares]);

  // SVG Dual-Curve Chart Coordinates
  const svgWidth = 680;
  const svgHeight = 210;
  const padLeft = 42;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 32;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const yMin = Math.max(5, Math.floor(activeZone.wiltingPointVwc - 4));
  const yMax = Math.ceil(activeZone.fieldCapacityVwc + 4);

  const toX = (i: number) => padLeft + (i / (schedule.length - 1)) * plotW;
  const toY = (vwc: number) =>
    padTop + plotH - ((vwc - yMin) / Math.max(1, yMax - yMin)) * plotH;

  const autoDripPath = schedule
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.projectedVwcWithAutoDrip).toFixed(1)}`)
    .join(' ');

  const unassistedPath = schedule
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.projectedVwcNoIrrigation).toFixed(1)}`)
    .join(' ');

  const fcY = toY(activeZone.fieldCapacityVwc);
  const madY = toY(madThresholdVwc);
  const wpY = toY(activeZone.wiltingPointVwc);

  return (
    <div className="space-y-6">
      {/* Top Row: Parameter Scrubbers + Real-Time FAO-56 Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Parameter Column */}
        <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h2 className="text-base font-display font-semibold text-slate-100">
                  FAO-56 Penman-Monteith Calibration
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeZone.name} · {activeZone.soilType} ({activeZone.areaHectares} ha)
              </p>
            </div>

            {/* Temperature Anomaly Scrubber */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Heatwave / Temperature Delta</span>
                </span>
                <span className="font-mono font-semibold text-amber-400 tabular-nums">
                  {tempDeltaC >= 0 ? `+${tempDeltaC.toFixed(1)}` : tempDeltaC.toFixed(1)} °C
                </span>
              </div>
              <input
                type="range"
                min={-4}
                max={8}
                step={0.5}
                value={tempDeltaC}
                onChange={(e) => setTempDeltaC(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>-4.0°C Cooler</span>
                <span>Baseline ({activeZone.ambientTempC}°C)</span>
                <span>+8.0°C Heatwave</span>
              </div>
            </div>

            {/* Simulated Day-3 Rainfall Scrubber */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Forecasted Day-3 Precipitation</span>
                </span>
                <span className="font-mono font-semibold text-cyan-400 tabular-nums">
                  {simulatedRainDay3Mm.toFixed(0)} mm
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={35}
                step={5}
                value={simulatedRainDay3Mm}
                onChange={(e) => setSimulatedRainDay3Mm(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>0 mm (Dry)</span>
                <span>15 mm</span>
                <span>35 mm Storm</span>
              </div>
            </div>

            {/* Soil Physics Constants */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
              <div className="p-2.5 rounded bg-[#0B0F17] border border-slate-800">
                <div className="text-[11px] text-slate-400">Field Capacity</div>
                <div className="font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                  {activeZone.fieldCapacityVwc.toFixed(1)}%
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#0B0F17] border border-slate-800">
                <div className="text-[11px] text-slate-400">MAD Trigger</div>
                <div className="font-mono font-semibold text-amber-400 mt-0.5 tabular-nums">
                  {madThresholdVwc}%
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#0B0F17] border border-slate-800">
                <div className="text-[11px] text-slate-400">Wilting Point</div>
                <div className="font-mono font-semibold text-rose-400 mt-0.5 tabular-nums">
                  {activeZone.wiltingPointVwc.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800">
            <button
              onClick={() => {
                const grossMm = Math.max(
                  6.5,
                  Number(
                    (((activeZone.fieldCapacityVwc - activeZone.currentVwc) / 100) * 450 / 0.9).toFixed(1)
                  )
                );
                const mins = Math.round(grossMm * 8.5);
                onTriggerIrrigationNow(activeZone.id, mins, grossMm);
                setDispatchedNotice(
                  `Executed ${grossMm} mm (${mins} min) sub-surface drip cycle on ${activeZone.name}.`
                );
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-md transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute Precision Refill to Field Capacity</span>
            </button>
            {dispatchedNotice && (
              <div className="mt-2 text-[11px] font-mono text-emerald-400 text-center">
                {dispatchedNotice}
              </div>
            )}
          </div>
        </div>

        {/* Right Main Chart Stage: 7-Day Root-Zone Moisture Trajectory */}
        <div className="lg:col-span-8 bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-display font-semibold text-slate-100">
                  7-Day Root-Zone Volumetric Water Content (VWC %) & Depletion Curve
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Solid Cyan: Closed-Loop Automated Drip · Dashed Rose: Unassisted Evapotranspiration Depletion
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400">ETc:</span>{' '}
                  <span className="text-cyan-400 font-semibold tabular-nums">{liveMetrics.etc} mm/d</span>
                </div>
                <div>
                  <span className="text-slate-400">VPD:</span>{' '}
                  <span className="text-amber-400 font-semibold tabular-nums">{liveMetrics.vpdKpa} kPa</span>
                </div>
                <div>
                  <span className="text-slate-400">Weekly Savings:</span>{' '}
                  <span className="text-emerald-400 font-semibold tabular-nums">{totalWeeklyWaterSavedM3} m³</span>
                </div>
              </div>
            </div>

            {/* SVG Scientific Dual-Curve Chart */}
            <div className="mt-4 relative bg-[#0B0F17] border border-slate-800 rounded-lg p-3">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-[210px] overflow-visible select-none"
              >
                {/* Horizontal Reference Threshold Lines */}
                <line
                  x1={padLeft}
                  y1={fcY}
                  x2={svgWidth - padRight}
                  y2={fcY}
                  stroke="#10B981"
                  strokeOpacity="0.35"
                  strokeDasharray="4 4"
                />
                <text x={padLeft + 6} y={fcY - 5} fill="#10B981" fontSize="10" fontFamily="JetBrains Mono">
                  Field Capacity ({activeZone.fieldCapacityVwc}%)
                </text>

                <line
                  x1={padLeft}
                  y1={madY}
                  x2={svgWidth - padRight}
                  y2={madY}
                  stroke="#F59E0B"
                  strokeOpacity="0.45"
                  strokeDasharray="6 4"
                />
                <text x={padLeft + 6} y={madY - 5} fill="#F59E0B" fontSize="10" fontFamily="JetBrains Mono">
                  MAD Irrigation Trigger ({madThresholdVwc}%)
                </text>

                <line
                  x1={padLeft}
                  y1={wpY}
                  x2={svgWidth - padRight}
                  y2={wpY}
                  stroke="#F43F5E"
                  strokeOpacity="0.45"
                  strokeDasharray="3 3"
                />
                <text x={padLeft + 6} y={wpY - 5} fill="#F43F5E" fontSize="10" fontFamily="JetBrains Mono">
                  Permanent Wilting Point ({activeZone.wiltingPointVwc}%)
                </text>

                {/* Unassisted Depletion Curve (Dashed Rose) */}
                <path
                  d={unassistedPath}
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />

                {/* Closed-Loop Automated Drip Curve (Solid Cyan) */}
                <path d={autoDripPath} fill="none" stroke="#06B6D4" strokeWidth="2.5" />

                {/* Interactive Data Points */}
                {schedule.map((d, i) => {
                  const cx = toX(i);
                  const cyAuto = toY(d.projectedVwcWithAutoDrip);
                  const cyNoIrr = toY(d.projectedVwcNoIrrigation);
                  return (
                    <g
                      key={d.dayLabel}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="cursor-pointer"
                    >
                      <line
                        x1={cx}
                        y1={padTop}
                        x2={cx}
                        y2={svgHeight - padBottom}
                        stroke={hoveredIdx === i ? '#38BDF8' : '#1E293B'}
                        strokeWidth={hoveredIdx === i ? '1.5' : '1'}
                      />
                      <circle cx={cx} cy={cyNoIrr} r={3.5} fill="#F43F5E" />
                      <circle
                        cx={cx}
                        cy={cyAuto}
                        r={hoveredIdx === i ? 6 : 4.5}
                        fill="#06B6D4"
                        stroke="#0B0F17"
                        strokeWidth="1.5"
                      />
                      <text
                        x={cx}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="10"
                        fontFamily="JetBrains Mono"
                      >
                        {d.dateStr}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Crosshair HUD Readout */}
              {hoveredIdx !== null && schedule[hoveredIdx] && (
                <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono text-slate-300">
                  <span>
                    {schedule[hoveredIdx].dayLabel} ({schedule[hoveredIdx].dateStr})
                  </span>
                  <span>
                    Auto-Drip VWC: <strong className="text-cyan-400">{schedule[hoveredIdx].projectedVwcWithAutoDrip}%</strong>
                  </span>
                  <span>
                    Unassisted VWC: <strong className="text-rose-400">{schedule[hoveredIdx].projectedVwcNoIrrigation}%</strong>
                  </span>
                  <span>
                    Prescribed Dose: <strong className="text-emerald-400">{schedule[hoveredIdx].recommendedGrossIrrigationMm} mm</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* High-Density 7-Day Irrigation Schedule Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400">
                  <th className="py-2 pr-3">DAY / DATE</th>
                  <th className="py-2 px-3 text-right">TEMP / SOLAR</th>
                  <th className="py-2 px-3 text-right">RAIN</th>
                  <th className="py-2 px-3 text-right">CROP ETc</th>
                  <th className="py-2 px-3 text-right">UNASSISTED VWC</th>
                  <th className="py-2 px-3 text-right">AUTO-DRIP DOSE</th>
                  <th className="py-2 pl-3 text-right">VALVE RUNTIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-mono tabular-nums">
                {schedule.map((row) => (
                  <tr key={row.dayLabel} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-2 pr-3 font-sans font-medium text-slate-200">
                      {row.dayLabel} <span className="text-slate-500">· {row.dateStr}</span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {row.ambientTempC}°C · {row.solarRadiationMj} MJ
                    </td>
                    <td className="py-2 px-3 text-right text-cyan-400">
                      {row.rainMm > 0 ? `${row.rainMm.toFixed(1)} mm` : '0.0 mm'}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-400">
                      -{row.etcMm.toFixed(2)} mm
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={
                          row.stressRisk === 'CRITICAL_WILTING'
                            ? 'text-rose-400 font-semibold'
                            : row.stressRisk === 'MODERATE_DEPLETION'
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }
                      >
                        {row.projectedVwcNoIrrigation.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {row.recommendedGrossIrrigationMm > 0 ? (
                        <span className="text-emerald-400 font-semibold flex items-center justify-end gap-1">
                          <Droplets className="w-3 h-3" />
                          +{row.recommendedGrossIrrigationMm.toFixed(1)} mm
                        </span>
                      ) : (
                        <span className="text-slate-500">Hold (0.0 mm)</span>
                      )}
                    </td>
                    <td className="py-2 pl-3 text-right text-slate-300">
                      {row.recommendedDurationMinutes > 0
                        ? `${row.recommendedDurationMinutes} min`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
