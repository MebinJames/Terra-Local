import React, { useState } from 'react';
import {
  BookOpen,
  Sliders,
  ArrowUpRight,
  Cpu,
  Droplets,
  ScanLine,
  MessageSquare,
  Settings2,
  LayoutDashboard,
  FlaskConical,
} from 'lucide-react';

export type GuideTargetTab =
  | 'telemetry'
  | 'vision'
  | 'irrigation'
  | 'agronomist'
  | 'automation';

interface SystemGuideProps {
  onNavigateToModule: (tab: GuideTargetTab) => void;
}

interface ControlExplanation {
  controlName: string;
  parameterUnit: string;
  whatItDoes: string;
  whatManipulatingItCauses: string;
  agronomicFormulaOrRule: string;
}

interface ModuleBlueprint {
  id: GuideTargetTab;
  indexNumber: string;
  title: string;
  subtitle: string;
  offlineArchitecture: string;
  scientificBasis: string;
  controls: ControlExplanation[];
}

const MODULE_BLUEPRINTS: ModuleBlueprint[] = [
  {
    id: 'telemetry',
    indexNumber: '01.',
    title: 'Field Telemetry & Interactive LoRaWAN Probe Simulator',
    subtitle: 'Real-time root-zone soil physics, matric potential, NPK balance, and multi-axis equilibrium radar.',
    offlineArchitecture:
      'Persists all 4 field sectors in local browser NVRAM (localStorage) and recalculates crop stress states and FAO-56 daily ETc on every slider step in < 2ms with zero network requests.',
    scientificBasis:
      'Combines Volumetric Water Content (VWC %) with Soil Matric Tension (kPa) and Nitrate (NO3-N ppm) to classify field sectors into Nominal, Drifting, or Critical states before permanent wilting occurs.',
    controls: [
      {
        controlName: 'Volumetric Soil Moisture (VWC %) Scrubber',
        parameterUnit: '8.0% – 40.0% VWC',
        whatItDoes:
          'Simulates capacitive TDR (Time-Domain Reflectometry) soil moisture probes buried at 30–45 cm active root depth.',
        whatManipulatingItCauses:
          'Dragging VWC below (Field Capacity - 8%) transitions the sector status to ▲ DRIFTING. Dropping VWC within 4% of the Permanent Wilting Point triggers ✖ CRITICAL status, shrinks the VWC vertex on the Agronomic Equilibrium Radar, increases calculated irrigation refill depth, and arms any "< % VWC" Drip Valve rules in the Automation PLC.',
        agronomicFormulaOrRule:
          'Net Refill Depth (mm) = [(Field Capacity VWC − Current VWC) / 100] × 450 mm Root Zone',
      },
      {
        controlName: 'Soil Tensiometer Matric Potential Scrubber',
        parameterUnit: '10.0 – 85.0 kPa',
        whatItDoes:
          'Measures the negative suction pressure (centibars / kPa) roots must exert to extract water from soil micropores.',
        whatManipulatingItCauses:
          'Raising soil tension above 55.0 kPa simulates severe root suction stress, flipping sector status to ✖ CRITICAL and triggering the "High Tensiometer Matric Stress Emergency Valve" rule when you click "Run Local PLC".',
        agronomicFormulaOrRule:
          'Silt Loam Optimal Range: 15–45 kPa · Stress Threshold: > 55 kPa',
      },
      {
        controlName: 'Root-Zone Nitrate (NO3-N) Scrubber',
        parameterUnit: '12 – 90 ppm NO3-N',
        whatItDoes:
          'Adjusts available soil nitrate concentration measured by ion-selective electrode (ISE) soil probes.',
        whatManipulatingItCauses:
          'Lowering NO3-N below 40 ppm triggers ▲ DRIFTING status, contracts the NO3-N axis on the radar polygon, updates the Agronomist Q&A context to recommend UAN-32 or organic fish-emulsion side-dressing, and triggers automated Venturi fertigation pulses.',
        agronomicFormulaOrRule:
          'Critical Vegetative/Flowering Threshold: < 35–40 ppm NO3-N',
      },
      {
        controlName: 'Infrared Canopy Temperature Scrubber',
        parameterUnit: '15.0°C – 42.0°C',
        whatItDoes:
          'Simulates radiometric infrared leaf surface temperature relative to ambient air temperature.',
        whatManipulatingItCauses:
          'Increasing canopy temperature above 33.0°C indicates stomatal closure and transpiration failure, arming the "Canopy Heat-Stress Evaporative Mist Cooling" actuator rule.',
        agronomicFormulaOrRule:
          'Crop Water Stress Index (CWSI) rises sharply when T_canopy > T_ambient + 2.0°C',
      },
    ],
  },
  {
    id: 'vision',
    indexNumber: '02.',
    title: 'On-Device Optical Crop Vision & Leaf Spectral Scanner',
    subtitle: 'HTML5 Canvas pixel-level chlorophyll, chlorosis, and necrotic target lesion classifier.',
    offlineArchitecture:
      'Executes a deterministic 2D pixel traversal directly in the browser Canvas buffer, computing RGB spectral vegetation indices and drawing ROI bounding boxes locally without uploading images to a server.',
    scientificBasis:
      'Computes Visible Atmospherically Resistant Index (VARI) and Excess Green Index (ExG) across non-background leaf lamina pixels, separating healthy chlorophyll from yellow mobile chlorosis and dark brown fungal necrosis.',
    controls: [
      {
        controlName: 'Calibrated Field Specimen Presets (01 – 04)',
        parameterUnit: '4 Synthetic Botanical Specimens',
        whatItDoes:
          'Renders high-precision botanical leaf models onto the 440×300px optical stage (Nitrogen V-Chlorosis, Early Blight Alternaria lesions, Potassium Marginal Scorch, or Healthy Canopy).',
        whatManipulatingItCauses:
          'Switching specimens immediately re-runs pixel spectral analysis, recalculates Healthy Lamina %, Chlorotic Tissue %, Necrotic Area %, VARI Reflectance, and Lesion Cluster count, and plots amber square ROIs (chlorosis) and rose circular contours (necrotic lesions) onto the canvas.',
        agronomicFormulaOrRule:
          'VARI = (G − R) / (G + R − B) · ExG = 2G − R − B (normalized RGB)',
      },
      {
        controlName: 'Upload Leaf Photo / Field Camera Capture',
        parameterUnit: 'Local Image Buffer / WebRTC Stream',
        whatItDoes:
          'Loads any custom crop foliage photo from disk or captures a live frame from a tablet/phone camera into the local canvas.',
        whatManipulatingItCauses:
          'Runs the exact same pixel-by-pixel spectral segmentation on your own image, outputting an immediate pathology classification and confidence percentage completely offline.',
        agronomicFormulaOrRule:
          'Necrosis ≥ 6.5% → Critical Blight · Chlorosis ≥ 18% → Mobile N Deficit',
      },
      {
        controlName: 'Execute Prescribed Remedy on Active Sector',
        parameterUnit: 'Closed-Loop Vision-to-PLC Dispatch',
        whatItDoes:
          'Translates the optical leaf diagnosis directly into a hardware actuator command for the active sector.',
        whatManipulatingItCauses:
          'Clicking this button after a Nitrogen Chlorosis scan automatically engages the Venturi NPK Injector (+22 ppm NO3-N) in the active sector, logs the event in the PLC Audit Log, and restores sector health to ● NOMINAL.',
        agronomicFormulaOrRule:
          'Optical Diagnosis → Automated Solenoid / Venturi Hardware Execution',
      },
    ],
  },
  {
    id: 'irrigation',
    indexNumber: '03.',
    title: 'FAO-56 Penman-Monteith Irrigation Predictor',
    subtitle: '7-day root-zone water depletion modeling, Vapor Pressure Deficit (VPD), and drip runtime scheduling.',
    offlineArchitecture:
      'Solves the full FAO-56 Penman-Monteith evapotranspiration differential equation client-side for 7 consecutive days and renders an interactive dual-curve SVG trajectory.',
    scientificBasis:
      'Models atmospheric evaporative demand (ET0) from solar radiation, temperature, wind speed, and relative humidity, then scales by the crop growth-stage coefficient (Kc) to predict exact daily root-zone VWC % loss.',
    controls: [
      {
        controlName: 'Heatwave / Temperature Delta Scrubber',
        parameterUnit: '-4.0°C to +8.0°C Anomaly',
        whatItDoes:
          'Shifts the 7-day ambient temperature curve up or down relative to the sector baseline.',
        whatManipulatingItCauses:
          'Sliding toward +8.0°C exponentially increases Saturation Vapor Pressure (es) and Vapor Pressure Deficit (VPD kPa), steepening the dashed rose "Unassisted Depletion" curve toward the Permanent Wilting Point and triggering earlier, longer automated drip refill cycles on the solid cyan curve.',
        agronomicFormulaOrRule:
          'es = 0.6108 × exp[(17.27 × T) / (T + 237.3)] · ETc = ET0 × Kc',
      },
      {
        controlName: 'Forecasted Day-3 Precipitation Scrubber',
        parameterUnit: '0 mm – 35 mm Rain Event',
        whatItDoes:
          'Injects a simulated rainfall event on Day 3 of the 7-day horizon (with 85% effective root-zone infiltration).',
        whatManipulatingItCauses:
          'Increasing Day-3 rainfall causes a visible upward recovery step in both SVG moisture curves on Day 3, automatically cancelling or reducing downstream automated drip irrigation doses and increasing weekly water savings (m³).',
        agronomicFormulaOrRule:
          'ΔVWC_gain (%) = [(Rain_mm × 0.85) / 450 mm Root Depth] × 100',
      },
      {
        controlName: 'Execute Precision Refill to Field Capacity',
        parameterUnit: 'Immediate Sub-Surface Drip Cycle',
        whatItDoes:
          'Calculates the exact gross water depth (mm) and valve duration (minutes) needed to bring the current sector back to Field Capacity at 90% drip efficiency.',
        whatManipulatingItCauses:
          'Opens the sector drip solenoid valve, boosts the sector VWC % and lowers soil tension kPa in real time across the entire app, and records the refill in the PLC execution log.',
        agronomicFormulaOrRule:
          'Gross Irrigation (mm) = Net Depth (mm) / 0.90 Drip Efficiency',
      },
    ],
  },
  {
    id: 'agronomist',
    indexNumber: '04.',
    title: 'Field Agronomist Q&A & Offline Reference Corpus',
    subtitle: 'Context-aware natural language farming assistant backed by an indexed local agronomic manual.',
    offlineArchitecture:
      'Scores natural-language farmer queries against an embedded corpus of pathology, soil chemistry, irrigation, and organic IPM protocols while injecting live telemetry from the active field sector.',
    scientificBasis:
      'Every answer combines quantitative sensor readings (current VWC %, kPa tension, ET0/ETc, VPD, NPK ppm, EC dS/m) with peer-reviewed agronomic thresholds and OMRI organic treatment dosages.',
    controls: [
      {
        controlName: 'Local Edge Engine vs. Hybrid Cloud Gemini Selector',
        parameterUnit: 'Inference Routing Toggle',
        whatItDoes:
          'Chooses between 100% On-Device Edge synthesis (zero internet required) and server-side Gemini 3.8 Flash cloud synthesis when connectivity is available.',
        whatManipulatingItCauses:
          'In Local Edge mode (or when Air-Gapped Field Mode is active in the top bar), responses return instantaneously from the on-device engine. In Hybrid Cloud mode while online, queries are sent to `/api/agronomist/ask` with full sector telemetry attached.',
        agronomicFormulaOrRule:
          'Automatic zero-downtime fallback to Local Edge Engine if network drops',
      },
      {
        controlName: 'Interactive Field Manual Protocol Cards',
        parameterUnit: '6 Indexed Agronomic Domains',
        whatItDoes:
          'Filters and displays reference cards for Nitrogen Chlorosis, Early Blight, FAO-56 Scheduling, Root-Zone Salinity (ECe), Fall Armyworm IPM, and P/K Deficiencies.',
        whatManipulatingItCauses:
          'Clicking any protocol card in the right-hand manual automatically synthesizes that protocol with the currently selected field sector’s live moisture, tension, and nutrient readings in the chat console.',
        agronomicFormulaOrRule:
          'Leaching Requirement LR = ECw / (5 × ECe_threshold − ECw)',
      },
    ],
  },
  {
    id: 'automation',
    indexNumber: '05.',
    title: 'Autonomous Field PLC & Solenoid Valve Controller',
    subtitle: 'Closed-loop sensor-to-actuator rule engine, manual hardware overrides, and NVRAM execution audit log.',
    offlineArchitecture:
      'Runs a deterministic Programmable Logic Controller (PLC) evaluation loop locally in the browser, persisting custom rules and actuator state transitions to local storage.',
    scientificBasis:
      'Eliminates human reaction delay by binding continuous soil and canopy telemetry thresholds (<, >, <=, >=) directly to solenoid valves, Venturi fertilizer injectors, and evaporative misting relays.',
    controls: [
      {
        controlName: 'Closed-Loop AI Automation Master Switch (ARMED / MANUAL)',
        parameterUnit: 'Boolean PLC Interlock',
        whatItDoes:
          'Enables or disables automatic rule execution when sensor drift occurs.',
        whatManipulatingItCauses:
          'When ARMED, clicking "Step Telemetry & Evaluate Rules Now" automatically opens/closes valves and pulses injectors whenever a rule threshold is crossed. When set to MANUAL ONLY, sensor drift is recorded but hardware actuators only move when manually toggled by the farmer.',
        agronomicFormulaOrRule:
          'IF (Sensor_Metric [op] Threshold) AND (PLC == ARMED) → Execute Actuator',
      },
      {
        controlName: 'Step Telemetry & Evaluate Rules Now',
        parameterUnit: 'Discrete Time-Step Simulation',
        whatItDoes:
          'Advances field evapotranspiration by one time step (-0.8% VWC, +2.1 kPa soil tension across sectors) and runs all enabled automation rules.',
        whatManipulatingItCauses:
          'Demonstrates closed-loop autonomy in action: as VWC drops below rule thresholds, matching rules fire, valves open, root-zone VWC rebounds (+3.2% VWC), and timestamped audit entries appear in the Real-Time Actuator Execution Log.',
        agronomicFormulaOrRule:
          'Closed-Loop Negative Feedback Stabilization of Root-Zone Moisture',
      },
      {
        controlName: 'Direct Hardware Overrides & Custom Rule Builder',
        parameterUnit: '4 Solenoid Valves · 4 Venturi Injectors',
        whatItDoes:
          'Provides one-click manual override buttons for every sector’s Sub-Surface Drip Valve and Venturi NPK Injector, plus a form to create new custom rules.',
        whatManipulatingItCauses:
          'Toggling a valve immediately updates flow rate (L/min) across the entire application and logs a MANUAL_OVERRIDE entry. Adding a custom rule appends it to the active PLC matrix immediately.',
        agronomicFormulaOrRule:
          'Full local persistence across browser reloads and offline sessions',
      },
    ],
  },
];

export const SystemGuide: React.FC<SystemGuideProps> = ({ onNavigateToModule }) => {
  const [selectedModuleId, setSelectedModuleId] = useState<GuideTargetTab | 'ALL'>('ALL');

  const visibleModules =
    selectedModuleId === 'ALL'
      ? MODULE_BLUEPRINTS
      : MODULE_BLUEPRINTS.filter((m) => m.id === selectedModuleId);

  return (
    <div className="space-y-6">
      {/* Top Architectural Overview Header */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="max-w-3xl">
            <div className="text-xs font-mono text-emerald-400">
              SYSTEM ARCHITECTURE &amp; INTERACTIVE CAUSE-AND-EFFECT REFERENCE
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-100 mt-1">
              How TerraLocal AgOS Works &amp; What Manipulating Each Control Does
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              TerraLocal AgOS is an offline-first agricultural intelligence and closed-loop automation workstation. Every slider, specimen preset, and valve toggle is wired to real mathematical models—including the <strong>FAO-56 Penman-Monteith evapotranspiration equation</strong>, <strong>HTML5 Canvas pixel spectral indices (VARI &amp; ExG)</strong>, and a <strong>deterministic Programmable Logic Controller (PLC)</strong>—so changes in one module propagate across the entire farm state.
            </p>
          </div>

          <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-3.5 text-xs font-mono space-y-1.5 shrink-0">
            <div className="text-slate-400">GLOBAL SYSTEM INTERLOCKS</div>
            <div className="text-emerald-400">● 100% Offline Service Worker Cache</div>
            <div className="text-cyan-400">● Cross-Module Shared State Bus</div>
            <div className="text-amber-400">● Persistent Local NVRAM Storage</div>
          </div>
        </div>

        {/* End-to-End Cause & Effect Signal Chain */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-md bg-[#0B0F17] border border-slate-800">
            <div className="font-mono text-emerald-400 font-semibold">STEP 01 · SENSE &amp; SCRUB</div>
            <div className="font-semibold text-slate-100 mt-1">Manipulate Field Probes or Scan Foliage</div>
            <p className="text-slate-400 mt-1 leading-relaxed">
              Adjust soil VWC %, matric tension kPa, nitrate ppm, temperature anomalies, or scan a diseased crop leaf on the optical canvas.
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-[#0B0F17] border border-slate-800">
            <div className="font-mono text-cyan-400 font-semibold">STEP 02 · LOCAL INFERENCE</div>
            <div className="font-semibold text-slate-100 mt-1">On-Device Physics &amp; Spectral Math</div>
            <p className="text-slate-400 mt-1 leading-relaxed">
              Browser computes FAO-56 daily ETc, 7-day root-zone depletion curves, VARI/ExG chlorophyll indices, and stress classifications in real time.
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-[#0B0F17] border border-slate-800">
            <div className="font-mono text-amber-400 font-semibold">STEP 03 · AGRONOMIC Q&amp;A</div>
            <div className="font-semibold text-slate-100 mt-1">Context-Grounded Prescriptions</div>
            <p className="text-slate-400 mt-1 leading-relaxed">
              The Agronomist AI reads your updated sensor readings and prescribes exact NPK kg/ha rates, leaching fractions, and organic remedies.
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-[#0B0F17] border border-slate-800">
            <div className="font-mono text-rose-400 font-semibold">STEP 04 · ACTUATE &amp; LOG</div>
            <div className="font-semibold text-slate-100 mt-1">Closed-Loop PLC Hardware Execution</div>
            <p className="text-slate-400 mt-1 leading-relaxed">
              Threshold breaches or vision remedies automatically open drip solenoid valves or pulse Venturi NPK injectors, restoring VWC % and logging to NVRAM.
            </p>
          </div>
        </div>

        {/* Interactive Module Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-mono text-slate-400 mr-1">FILTER COMPONENT GUIDE:</span>
            <button
              onClick={() => setSelectedModuleId('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedModuleId === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'bg-[#0B0F17] text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              All 5 Modules (Complete Guide)
            </button>
            <button
              onClick={() => setSelectedModuleId('telemetry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedModuleId === 'telemetry'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'bg-[#0B0F17] text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>01. Field Telemetry</span>
            </button>
            <button
              onClick={() => setSelectedModuleId('vision')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedModuleId === 'vision'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'bg-[#0B0F17] text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>02. Crop Vision AI</span>
            </button>
            <button
              onClick={() => setSelectedModuleId('irrigation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedModuleId === 'irrigation'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'bg-[#0B0F17] text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>03. Irrigation Forecast</span>
            </button>
            <button
              onClick={() => setSelectedModuleId('agronomist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedModuleId === 'agronomist'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'bg-[#0B0F17] text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>04. Agronomist Q&amp;A</span>
            </button>
            <button
              onClick={() => setSelectedModuleId('automation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedModuleId === 'automation'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'bg-[#0B0F17] text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>05. Automation PLC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Component & Manipulation Cards */}
      <div className="space-y-6">
        {visibleModules.map((mod) => (
          <section
            key={mod.id}
            className="bg-[#111827] border border-slate-800 rounded-lg p-6 space-y-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {mod.indexNumber}
                  </span>
                  <h2 className="text-lg font-display font-semibold text-slate-100">
                    {mod.title}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">{mod.subtitle}</p>
              </div>

              <button
                onClick={() => onNavigateToModule(mod.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Open Interactive Module</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Architecture & Scientific Basis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-md bg-[#0B0F17] border border-slate-800">
                <div className="flex items-center gap-1.5 font-semibold text-cyan-400 mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Offline Edge Execution Mechanism</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{mod.offlineArchitecture}</p>
              </div>

              <div className="p-3.5 rounded-md bg-[#0B0F17] border border-slate-800">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-1">
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Agronomic &amp; Physical Model</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{mod.scientificBasis}</p>
              </div>
            </div>

            {/* Interactive Controls Cause-and-Effect Table */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-3">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Interactive Controls — What They Do &amp; What Manipulating Them Causes:</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-800 rounded-lg">
                  <thead>
                    <tr className="bg-[#0B0F17] border-b border-slate-800 text-[11px] font-mono text-slate-400">
                      <th className="py-2.5 px-3.5 w-[22%]">INTERACTIVE CONTROL / RANGE</th>
                      <th className="py-2.5 px-3.5 w-[26%]">WHAT IT REPRESENTS</th>
                      <th className="py-2.5 px-3.5 w-[34%]">WHAT MANIPULATING IT CAUSES IN THE APP</th>
                      <th className="py-2.5 px-3.5 w-[18%]">GOVERNING EQUATION / RULE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {mod.controls.map((ctrl) => (
                      <tr key={ctrl.controlName} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-3.5 align-top">
                          <div className="font-semibold text-slate-100">{ctrl.controlName}</div>
                          <div className="text-[11px] font-mono text-amber-400 mt-1 tabular-nums">
                            {ctrl.parameterUnit}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 align-top text-slate-300 leading-relaxed">
                          {ctrl.whatItDoes}
                        </td>
                        <td className="py-3 px-3.5 align-top text-slate-200 leading-relaxed">
                          {ctrl.whatManipulatingItCauses}
                        </td>
                        <td className="py-3 px-3.5 align-top font-mono text-[11px] text-cyan-400 leading-relaxed">
                          {ctrl.agronomicFormulaOrRule}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Header Global Controls Explanation Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base font-display font-semibold text-slate-100">
            Global Header Controls &amp; Sector Switcher Reference
          </h3>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-md bg-[#0B0F17] border border-slate-800 space-y-1.5">
            <div className="font-mono text-amber-400 font-semibold">
              EDGE LOCAL + SYNC / AIR-GAPPED FIELD MODE
            </div>
            <p className="text-slate-300 leading-relaxed">
              Clicking the connectivity button in the top-right header toggles <strong>Simulated Air-Gapped Field Mode</strong>. When active, it forces the application to sever optional cloud calls and proves that all leaf vision diagnostics, FAO-56 irrigation forecasts, Q&amp;A synthesis, and PLC automation run 100% locally on your device.
            </p>
          </div>

          <div className="p-4 rounded-md bg-[#0B0F17] border border-slate-800 space-y-1.5">
            <div className="font-mono text-emerald-400 font-semibold">
              ACTIVE SECTOR BAR (A1 · B2 · C3 · D4)
            </div>
            <p className="text-slate-300 leading-relaxed">
              Switching the active sector in the sub-header immediately re-binds the <strong>Crop Vision AI</strong>, <strong>Irrigation Forecast</strong>, and <strong>Agronomist Q&amp;A</strong> modules to that sector&apos;s specific crop variety, Kc coefficient, soil texture (Silt Loam, Sandy Loam, Clay Loam), Field Capacity, and NPK telemetry.
            </p>
          </div>

          <div className="p-4 rounded-md bg-[#0B0F17] border border-slate-800 space-y-1.5">
            <div className="font-mono text-cyan-400 font-semibold">
              RESET SENSORS &amp; LOCAL NVRAM PERSISTENCE
            </div>
            <p className="text-slate-300 leading-relaxed">
              All slider adjustments, valve overrides, and custom PLC automation rules are automatically saved to `localStorage`. Clicking <strong>Reset Sensors</strong> in the sub-header restores all four sectors and automation rules to their factory-calibrated baseline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
