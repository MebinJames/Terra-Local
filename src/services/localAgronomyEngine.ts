import {
  CropDiagnosisResult,
  FieldZone,
  LeafSpectralMetrics,
  OFFLINE_KNOWLEDGE_BASE,
} from '../data/agronomyData';

/**
 * 1. FAO-56 Penman-Monteith Evapotranspiration (ET0 & ETc) + 7-Day Irrigation Forecast
 * Runs 100% locally in the browser with zero network dependency.
 */
export interface DailyIrrigationForecast {
  dayLabel: string;
  dateStr: string;
  ambientTempC: number;
  solarRadiationMj: number;
  rainMm: number;
  et0Mm: number;
  etcMm: number;
  projectedVwcNoIrrigation: number;
  projectedVwcWithAutoDrip: number;
  recommendedGrossIrrigationMm: number;
  recommendedDurationMinutes: number;
  stressRisk: 'NOMINAL' | 'MODERATE_DEPLETION' | 'CRITICAL_WILTING';
}

export function computeFAO56Evapotranspiration(
  tempC: number,
  relativeHumidity: number,
  windSpeedMs: number,
  solarRadiationMj: number,
  kc: number
): { et0: number; etc: number; vpdKpa: number } {
  // Saturation Vapor Pressure (es) in kPa
  const es = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  // Actual Vapor Pressure (ea) in kPa
  const ea = es * (Math.max(10, Math.min(100, relativeHumidity)) / 100);
  // Vapor Pressure Deficit (VPD)
  const vpdKpa = Math.max(0.05, es - ea);

  // Slope of saturation vapor pressure curve (Delta) in kPa/°C
  const delta = (4098 * es) / Math.pow(tempC + 237.3, 2);
  // Psychrometric constant (gamma) at standard atmospheric pressure ~100 kPa
  const gamma = 0.0665;

  // Net radiation approximation Rn from solar radiation (0.77 albedo factor - longwave)
  const rn = Math.max(2, 0.77 * solarRadiationMj - 2.4);

  // FAO-56 Penman-Monteith daily reference evapotranspiration (ET0 in mm/day)
  const radiationTerm = 0.408 * delta * rn;
  const aerodynamicTerm =
    gamma * (900 / (tempC + 273)) * windSpeedMs * vpdKpa;
  const denominator = delta + gamma * (1 + 0.34 * windSpeedMs);

  const et0 = Math.max(0.8, (radiationTerm + aerodynamicTerm) / denominator);
  const etc = et0 * kc;

  return {
    et0: Number(et0.toFixed(2)),
    etc: Number(etc.toFixed(2)),
    vpdKpa: Number(vpdKpa.toFixed(2)),
  };
}

export function generate7DayIrrigationSchedule(
  zone: FieldZone,
  weatherAdjustTempDelta = 0,
  simulatedRainDay3Mm = 0
): DailyIrrigationForecast[] {
  const rootDepthMm = 450; // Effective active root zone depth in mm
  const madThresholdVwc =
    zone.wiltingPointVwc +
    (zone.fieldCapacityVwc - zone.wiltingPointVwc) * 0.55; // 45% MAD

  let runningVwcNoIrr = zone.currentVwc;
  let runningVwcAuto = zone.currentVwc;

  const days = ['Day 1 (Today)', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  const baseDate = new Date();

  return days.map((label, idx) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + idx);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Diurnal & multi-day microclimate oscillation
    const tempVariation = Math.sin(idx * 0.9) * 1.8 + weatherAdjustTempDelta;
    const dayTemp = Number((zone.ambientTempC + tempVariation).toFixed(1));
    const daySolar = Number(
      Math.max(10, zone.solarRadiationMj + Math.cos(idx * 0.8) * 2.5).toFixed(1)
    );
    const rainMm = idx === 2 ? simulatedRainDay3Mm : idx === 5 && simulatedRainDay3Mm > 10 ? 4.0 : 0;

    const { et0, etc } = computeFAO56Evapotranspiration(
      dayTemp,
      zone.relativeHumidity,
      zone.windSpeedMs,
      daySolar,
      zone.kc
    );

    // Convert mm water loss/gain to % VWC change in 450mm root zone
    const vwcLossPct = (etc / rootDepthMm) * 100;
    const vwcRainGainPct = ((rainMm * 0.85) / rootDepthMm) * 100;

    runningVwcNoIrr = Math.max(
      zone.wiltingPointVwc - 2,
      Math.min(zone.fieldCapacityVwc, runningVwcNoIrr - vwcLossPct + vwcRainGainPct)
    );

    runningVwcAuto = Math.max(
      zone.wiltingPointVwc,
      Math.min(zone.fieldCapacityVwc, runningVwcAuto - vwcLossPct + vwcRainGainPct)
    );

    let recommendedGrossIrrigationMm = 0;
    let recommendedDurationMinutes = 0;

    if (runningVwcAuto < madThresholdVwc) {
      // Refill to Field Capacity with 90% drip efficiency
      const vwcDeficit = zone.fieldCapacityVwc - runningVwcAuto;
      const netDepthMm = (vwcDeficit / 100) * rootDepthMm;
      recommendedGrossIrrigationMm = Number((netDepthMm / 0.9).toFixed(1));
      // Flow calculation per hectare
      recommendedDurationMinutes = Math.round(recommendedGrossIrrigationMm * 8.5);
      runningVwcAuto = zone.fieldCapacityVwc - 0.8;
    }

    let stressRisk: DailyIrrigationForecast['stressRisk'] = 'NOMINAL';
    if (runningVwcNoIrr <= zone.wiltingPointVwc + 2.5) {
      stressRisk = 'CRITICAL_WILTING';
    } else if (runningVwcNoIrr < madThresholdVwc) {
      stressRisk = 'MODERATE_DEPLETION';
    }

    return {
      dayLabel: label,
      dateStr,
      ambientTempC: dayTemp,
      solarRadiationMj: daySolar,
      rainMm,
      et0Mm: et0,
      etcMm: etc,
      projectedVwcNoIrrigation: Number(runningVwcNoIrr.toFixed(1)),
      projectedVwcWithAutoDrip: Number(runningVwcAuto.toFixed(1)),
      recommendedGrossIrrigationMm,
      recommendedDurationMinutes,
      stressRisk,
    };
  });
}

/**
 * 2. Local Canvas Pixel Spectral & Lesion Analyzer
 * Draws a leaf specimen or uploaded image onto an HTML5 Canvas, computes pixel-level
 * VARI (Visible Atmospherically Resistant Index), ExG (Excess Green), chlorotic fraction,
 * and necrotic lesion density, and overlays diagnostic bounding contours.
 */
export type SyntheticSpecimenPreset =
  | 'NITROGEN_CHLOROSIS'
  | 'EARLY_BLIGHT_LESIONS'
  | 'HEALTHY_TURGID_CANOPY'
  | 'POTASSIUM_MARGINAL_SCORCH';

export function renderSyntheticLeafSpecimenToCanvas(
  canvas: HTMLCanvasElement,
  preset: SyntheticSpecimenPreset
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Dark soil/laboratory calibration mat background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, w, h);

  // Subtle calibration grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(w / 2, h / 2);

  // Base leaf blade geometry
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.38);
  ctx.bezierCurveTo(w * 0.34, -h * 0.25, w * 0.36, h * 0.22, 0, h * 0.40);
  ctx.bezierCurveTo(-w * 0.36, h * 0.22, -w * 0.34, -h * 0.25, 0, -h * 0.38);
  ctx.closePath();

  if (preset === 'HEALTHY_TURGID_CANOPY') {
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, w * 0.38);
    grad.addColorStop(0, '#22C55E');
    grad.addColorStop(0.7, '#15803D');
    grad.addColorStop(1, '#166534');
    ctx.fillStyle = grad;
    ctx.fill();
  } else if (preset === 'NITROGEN_CHLOROSIS') {
    // V-shaped mobile chlorosis progressing from leaf tip down midrib
    const grad = ctx.createLinearGradient(0, -h * 0.38, 0, h * 0.40);
    grad.addColorStop(0, '#EAB308'); // Yellow chlorotic tip
    grad.addColorStop(0.45, '#CA8A04');
    grad.addColorStop(0.8, '#4D7C0F');
    grad.addColorStop(1, '#15803D');
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner V-chlorosis wedge
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.38);
    ctx.lineTo(w * 0.16, 0);
    ctx.lineTo(0, h * 0.18);
    ctx.lineTo(-w * 0.16, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(250, 204, 21, 0.78)';
    ctx.fill();
  } else if (preset === 'EARLY_BLIGHT_LESIONS') {
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, w * 0.38);
    grad.addColorStop(0, '#16A34A');
    grad.addColorStop(1, '#15803D');
    ctx.fillStyle = grad;
    ctx.fill();

    // Concentric bullseye necrotic lesions with yellow chlorotic halos
    const lesions = [
      { x: -w * 0.11, y: -h * 0.08, r: 22 },
      { x: w * 0.12, y: h * 0.05, r: 26 },
      { x: -w * 0.06, y: h * 0.18, r: 19 },
      { x: w * 0.08, y: -h * 0.19, r: 16 },
      { x: 0, y: h * 0.02, r: 14 },
    ];
    lesions.forEach((l) => {
      // Chlorotic halo
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r * 1.45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(234, 179, 8, 0.85)';
      ctx.fill();

      // Necrotic dark brown lesion body
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fillStyle = '#451A03';
      ctx.fill();

      // Target ring
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
  } else if (preset === 'POTASSIUM_MARGINAL_SCORCH') {
    // Outer margin scorch & chlorosis with green interior
    ctx.fillStyle = '#B45309'; // Scorched margin
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -h * 0.33);
    ctx.bezierCurveTo(w * 0.28, -h * 0.20, w * 0.30, h * 0.18, 0, h * 0.34);
    ctx.bezierCurveTo(-w * 0.30, h * 0.18, -w * 0.28, -h * 0.20, 0, -h * 0.33);
    ctx.closePath();
    ctx.fillStyle = '#EAB308'; // Sub-marginal chlorosis
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -h * 0.26);
    ctx.bezierCurveTo(w * 0.20, -h * 0.15, w * 0.22, h * 0.14, 0, h * 0.28);
    ctx.bezierCurveTo(-w * 0.22, h * 0.14, -w * 0.20, -h * 0.15, 0, -h * 0.26);
    ctx.closePath();
    ctx.fillStyle = '#15803D'; // Healthy midrib zone
    ctx.fill();
  }

  // Leaf vascular veins
  ctx.strokeStyle = 'rgba(187, 247, 208, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.36);
  ctx.lineTo(0, h * 0.38);
  ctx.stroke();

  ctx.lineWidth = 1.8;
  for (let i = -3; i <= 3; i++) {
    const yStart = i * (h * 0.085);
    ctx.beginPath();
    ctx.moveTo(0, yStart);
    ctx.lineTo(w * 0.18, yStart - h * 0.06);
    ctx.moveTo(0, yStart);
    ctx.lineTo(-w * 0.18, yStart - h * 0.06);
    ctx.stroke();
  }

  ctx.restore();
}

export function analyzeLeafCanvasLocally(
  canvas: HTMLCanvasElement,
  zone: FieldZone,
  drawOverlay = true
): CropDiagnosisResult {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let leafPixels = 0;
  let healthyGreenPixels = 0;
  let chloroticYellowPixels = 0;
  let necroticBrownPixels = 0;
  let variSum = 0;
  let exgSum = 0;

  const chloroticBoxes: { x: number; y: number }[] = [];
  const necroticBoxes: { x: number; y: number }[] = [];

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Ignore dark background calibration mat (#0F172A has R<30, G<40, B<60)
      if (r < 35 && g < 45 && b < 65) continue;

      leafPixels++;
      const normR = r / 255;
      const normG = g / 255;
      const normB = b / 255;

      // Excess Green Index (ExG = 2G - R - B)
      const exg = 2 * normG - normR - normB;
      exgSum += exg;

      // Visible Atmospherically Resistant Index: VARI = (G - R) / (G + R - B)
      const denom = normG + normR - normB;
      const vari = Math.abs(denom) > 0.01 ? (normG - normR) / denom : 0;
      variSum += Math.max(-1, Math.min(1, vari));

      // Classify pixel spectral signature
      if (r > 140 && g > 110 && b < 90 && Math.abs(r - g) < 85) {
        chloroticYellowPixels++;
        if (chloroticYellowPixels % 45 === 0) chloroticBoxes.push({ x, y });
      } else if (r > 50 && r < 185 && g < 95 && b < 65 && r > g * 1.15) {
        necroticBrownPixels++;
        if (necroticBrownPixels % 25 === 0) necroticBoxes.push({ x, y });
      } else if (g > r * 1.05 && g > b) {
        healthyGreenPixels++;
      } else {
        healthyGreenPixels++;
      }
    }
  }

  const total = Math.max(1, leafPixels);
  const greenFraction = Number(((healthyGreenPixels / total) * 100).toFixed(1));
  const chlorosisFraction = Number(((chloroticYellowPixels / total) * 100).toFixed(1));
  const necrosisFraction = Number(((necroticBrownPixels / total) * 100).toFixed(1));
  const variIndex = Number((variSum / total).toFixed(3));
  const exgIndex = Number((exgSum / total).toFixed(3));
  const lesionClusterCount = Math.min(28, Math.round(necroticBoxes.length / 3));

  // Draw HUD diagnostic bounding contours directly on canvas
  if (drawOverlay) {
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
    ctx.lineWidth = 1.2;
    chloroticBoxes.slice(0, 14).forEach((pt) => {
      ctx.strokeRect(pt.x - 10, pt.y - 10, 20, 20);
    });

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)';
    ctx.lineWidth = 1.5;
    necroticBoxes.slice(0, 12).forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  const spectralMetrics: LeafSpectralMetrics = {
    greenFraction,
    chlorosisFraction,
    necrosisFraction,
    variIndex,
    exgIndex,
    lesionClusterCount,
  };

  // Deterministic Agronomic Classifier Rule Engine
  if (necrosisFraction >= 6.5) {
    return {
      id: `diag-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      zoneId: zone.id,
      cropName: zone.crop,
      conditionName: 'Early Blight (Alternaria solani) / Necrotic Target Lesions',
      severity: 'CRITICAL',
      confidencePct: 94.2,
      causalAgent: 'Fungal Pathogen (Alternaria solani) accelerated by canopy humidity & warm foliage',
      physiologicalImpact: `Necrotic tissue covers ${necrosisFraction}% of leaf lamina with ${lesionClusterCount} active lesion clusters, reducing photosynthetic active radiation (PAR) capture and risking rapid defoliation.`,
      treatmentSteps: [
        'Immediately halt any overhead misting; restrict irrigation strictly to sub-surface drip lines.',
        'Apply OMRI Copper Octanoate (2.0 L/ha) or Bacillus amyloliquefaciens bio-fungicide within 24 hours.',
        'Prune infected lower canopy leaves up to 25 cm above soil line to prevent conidia splash dispersal.',
      ],
      spectralMetrics,
      engineUsed: 'On-Device Edge Spectral Vision v2.4 (Zero-Network)',
    };
  }

  if (chlorosisFraction >= 18.0 && necrosisFraction < 4.0) {
    return {
      id: `diag-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      zoneId: zone.id,
      cropName: zone.crop,
      conditionName: 'Mobile Nitrogen (NO3-N) Deficiency — V-Pattern Chlorosis',
      severity: 'MODERATE',
      confidencePct: 91.8,
      causalAgent: `Root-zone Nitrate depletion (Zone telemetry: ${zone.nitrogenPpm} ppm NO3-N) causing chlorophyll breakdown in older leaves`,
      physiologicalImpact: `Chlorotic lamina fraction measured at ${chlorosisFraction}% with depressed VARI index (${variIndex}). Stunted amino acid synthesis during ${zone.growthStage}.`,
      treatmentSteps: [
        `Trigger Venturi Fertigation Pulse: Inject 45 kg N/ha equivalent (UAN-32 or hydrolyzed fish emulsion 5-1-1) across ${zone.name}.`,
        'Verify soil pH remains between 6.0 and 6.8 to maximize nitrate and ammonium root uptake.',
        'Re-scan canopy in 96 hours to confirm VARI index recovery above +0.220.',
      ],
      spectralMetrics,
      engineUsed: 'On-Device Edge Spectral Vision v2.4 (Zero-Network)',
    };
  }

  if (chlorosisFraction >= 8.0 && necrosisFraction >= 2.5) {
    return {
      id: `diag-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      zoneId: zone.id,
      cropName: zone.crop,
      conditionName: 'Potassium (K+) Marginal Leaf Scorch & Osmotic Stress',
      severity: 'MODERATE',
      confidencePct: 89.4,
      causalAgent: 'Insufficient exchangeable K+ translocation under high fruit/grain sink demand',
      physiologicalImpact: `Combined marginal necrosis (${necrosisFraction}%) and sub-marginal chlorosis (${chlorosisFraction}%) impairs stomatal guard cell turgor regulation.`,
      treatmentSteps: [
        'Inject soluble Sulfate of Potash (0-0-50) at 85 kg/ha via drip irrigation.',
        `Maintain root-zone Volumetric Water Content above ${zone.wiltingPointVwc + 8}% to facilitate K+ mass flow.`,
        'Monitor soil Electrical Conductivity (ECe) to ensure salinity stays below 2.2 dS/m.',
      ],
      spectralMetrics,
      engineUsed: 'On-Device Edge Spectral Vision v2.4 (Zero-Network)',
    };
  }

  return {
    id: `diag-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    zoneId: zone.id,
    cropName: zone.crop,
    conditionName: 'Nominal Photosynthetic Canopy — High Chlorophyll Turgor',
    severity: 'NOMINAL',
    confidencePct: 96.5,
    causalAgent: 'Balanced NPK nutrition and optimal stomatal conductance',
    physiologicalImpact: `Healthy chlorophyll lamina covers ${greenFraction}% with strong VARI reflectance (${variIndex}) and ExG (${exgIndex}).`,
    treatmentSteps: [
      'Maintain current automated FAO-56 Penman-Monteith drip irrigation schedule.',
      'Continue routine weekly scouting; no foliar fungicide or corrective fertigation required.',
    ],
    spectralMetrics,
    engineUsed: 'On-Device Edge Spectral Vision v2.4 (Zero-Network)',
  };
}

/**
 * 3. Local Offline Agronomic Knowledge Base Q&A Engine
 * Evaluates farmer natural language questions against the embedded agronomic corpus
 * and live field telemetry to produce structured, quantitative answers completely offline.
 */
export function queryLocalAgronomistEngine(
  question: string,
  zones: FieldZone[],
  activeZoneId: string
): { answer: string; matchedArticles: string[]; engine: string } {
  const activeZone = zones.find((z) => z.id === activeZoneId) || zones[0];
  const qLower = question.toLowerCase();

  // Score each article in OFFLINE_KNOWLEDGE_BASE
  const scored = OFFLINE_KNOWLEDGE_BASE.map((article) => {
    let score = 0;
    article.keywords.forEach((kw) => {
      if (qLower.includes(kw.toLowerCase())) score += 3;
    });
    article.crops.forEach((crop) => {
      if (qLower.includes(crop.toLowerCase())) score += 2;
    });
    if (qLower.includes(article.category.toLowerCase())) score += 2;
    return { article, score };
  }).sort((a, b) => b.score - a.score);

  const topMatches = scored.filter((s) => s.score > 0).slice(0, 2);
  const selectedArticles =
    topMatches.length > 0 ? topMatches.map((m) => m.article) : [OFFLINE_KNOWLEDGE_BASE[2], OFFLINE_KNOWLEDGE_BASE[0]];

  const { et0, etc, vpdKpa } = computeFAO56Evapotranspiration(
    activeZone.ambientTempC,
    activeZone.relativeHumidity,
    activeZone.windSpeedMs,
    activeZone.solarRadiationMj,
    activeZone.kc
  );

  const vwcDeficit = Math.max(0, activeZone.fieldCapacityVwc - activeZone.currentVwc);
  const netIrrigationMm = ((vwcDeficit / 100) * 450).toFixed(1);

  const primary = selectedArticles[0];
  const secondary = selectedArticles[1];

  const answer = [
    `### 1. Local Telemetry Synthesis (${activeZone.name})`,
    `• **Active Crop**: ${activeZone.crop} (${activeZone.growthStage}, Kc = ${activeZone.kc.toFixed(2)})`,
    `• **Root-Zone Moisture**: ${activeZone.currentVwc.toFixed(1)}% VWC (Field Capacity: ${activeZone.fieldCapacityVwc.toFixed(1)}%, Matric Tension: ${activeZone.soilTensionKpa.toFixed(1)} kPa)`,
    `• **Real-Time Evapotranspiration**: ET₀ = ${et0} mm/day · Crop ETc = ${etc} mm/day · Vapor Pressure Deficit = ${vpdKpa} kPa`,
    `• **Soil Chemistry**: NO₃-N = ${activeZone.nitrogenPpm} ppm · P = ${activeZone.phosphorusPpm} ppm · K = ${activeZone.potassiumPpm} ppm · pH = ${activeZone.soilPh} · EC = ${activeZone.ecDsM} dS/m`,
    ``,
    `### 2. Diagnostic Assessment: ${primary.title}`,
    `${primary.diagnosticCriteria}`,
    ``,
    `• **Quantitative Thresholds**: ${primary.quantitativeThresholds}`,
    `• **Recommended Field Action**: ${primary.recommendedAction}`,
    `• **Organic / Regenerative Protocol**: ${primary.organicProtocol}`,
    secondary
      ? `\n### 3. Secondary Consideration: ${secondary.title}\n• **Action**: ${secondary.recommendedAction}`
      : '',
    ``,
    `### 4. Automated System Prescription for ${activeZone.name}`,
    activeZone.currentVwc < activeZone.fieldCapacityVwc - 6
      ? `• **Immediate Irrigation Required**: Current VWC (${activeZone.currentVwc.toFixed(1)}%) is below Management Allowed Depletion. Apply **${netIrrigationMm} mm net water depth** via sub-surface drip to restore Field Capacity.`
      : `• **Moisture Status Nominal**: Root-zone moisture (${activeZone.currentVwc.toFixed(1)}% VWC) is within optimal range. Next scheduled irrigation when VWC drops below ${(activeZone.wiltingPointVwc + (activeZone.fieldCapacityVwc - activeZone.wiltingPointVwc) * 0.55).toFixed(1)}%.`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    answer,
    matchedArticles: selectedArticles.map((a) => a.title),
    engine: 'TerraLocal On-Device Agronomic Engine (100% Offline)',
  };
}
