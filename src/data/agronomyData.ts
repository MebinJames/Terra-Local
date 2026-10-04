export type HealthStatus = 'NOMINAL' | 'DRIFTING' | 'CRITICAL';

export interface FieldZone {
  id: string;
  name: string;
  crop: string;
  variety: string;
  growthStage: 'Emergence' | 'Vegetative' | 'Flowering / Pollination' | 'Grain Fill / Fruiting' | 'Maturity';
  kc: number; // Crop coefficient (FAO-56)
  areaHectares: number;
  soilType: 'Sandy Loam' | 'Silt Loam' | 'Clay Loam';
  fieldCapacityVwc: number; // % VWC
  wiltingPointVwc: number; // % VWC
  currentVwc: number; // % Volumetric Water Content
  soilTensionKpa: number; // Centibars / kPa
  soilTempC: number;
  canopyTempC: number;
  ambientTempC: number;
  relativeHumidity: number;
  windSpeedMs: number;
  solarRadiationMj: number; // MJ/m2/day
  ecDsM: number; // Electrical conductivity dS/m
  soilPh: number;
  nitrogenPpm: number;
  phosphorusPpm: number;
  potassiumPpm: number;
  ndviScore: number;
  status: HealthStatus;
  valveOpen: boolean;
  fertigationActive: boolean;
  flowRateLpm: number;
  lastIrrigated: string;
}

export interface LeafSpectralMetrics {
  greenFraction: number;
  chlorosisFraction: number;
  necrosisFraction: number;
  variIndex: number; // Visible Atmospherically Resistant Index
  exgIndex: number; // Excess Green Index
  lesionClusterCount: number;
}

export interface CropDiagnosisResult {
  id: string;
  timestamp: string;
  zoneId: string;
  cropName: string;
  conditionName: string;
  severity: 'NOMINAL' | 'MODERATE' | 'CRITICAL';
  confidencePct: number;
  causalAgent: string;
  physiologicalImpact: string;
  treatmentSteps: string[];
  spectralMetrics: LeafSpectralMetrics;
  engineUsed: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  zoneId: string;
  metric: 'currentVwc' | 'soilTensionKpa' | 'canopyTempC' | 'ecDsM' | 'nitrogenPpm';
  operator: '<' | '>' | '<=' | '>=';
  threshold: number;
  unit: string;
  actionType: 'OPEN_IRRIGATION_VALVE' | 'CLOSE_IRRIGATION_VALVE' | 'PULSE_FERTIGATION_INJECTOR' | 'ACTIVATE_MIST_COOLING';
  durationMinutes: number;
  enabled: boolean;
  lastTriggered: string | null;
  triggerCount: number;
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  zoneName: string;
  ruleName: string;
  triggerReading: string;
  actionTaken: string;
  mode: 'AUTO_CLOSED_LOOP' | 'MANUAL_OVERRIDE';
}

export interface KnowledgeArticle {
  id: string;
  category: 'Pathology' | 'Irrigation' | 'Soil Chemistry' | 'Pest Control' | 'Automation';
  title: string;
  crops: string[];
  keywords: string[];
  diagnosticCriteria: string;
  quantitativeThresholds: string;
  recommendedAction: string;
  organicProtocol: string;
}

export const INITIAL_FIELD_ZONES: FieldZone[] = [
  {
    id: 'zone-a1',
    name: 'Sector A1 · North Terrace',
    crop: 'Zea mays (Hybrid Corn)',
    variety: 'Pioneer P1197AM',
    growthStage: 'Flowering / Pollination',
    kc: 1.20,
    areaHectares: 14.5,
    soilType: 'Silt Loam',
    fieldCapacityVwc: 34.0,
    wiltingPointVwc: 14.0,
    currentVwc: 21.4,
    soilTensionKpa: 48.5,
    soilTempC: 23.8,
    canopyTempC: 31.2,
    ambientTempC: 29.6,
    relativeHumidity: 42,
    windSpeedMs: 3.1,
    solarRadiationMj: 24.8,
    ecDsM: 1.45,
    soilPh: 6.4,
    nitrogenPpm: 38,
    phosphorusPpm: 29,
    potassiumPpm: 164,
    ndviScore: 0.74,
    status: 'DRIFTING',
    valveOpen: false,
    fertigationActive: false,
    flowRateLpm: 0,
    lastIrrigated: '38h ago',
  },
  {
    id: 'zone-b2',
    name: 'Sector B2 · High-Tunnel West',
    crop: 'Solanum lycopersicum (Roma Tomato)',
    variety: 'Determinate VFNT',
    growthStage: 'Grain Fill / Fruiting',
    kc: 1.15,
    areaHectares: 4.2,
    soilType: 'Sandy Loam',
    fieldCapacityVwc: 26.0,
    wiltingPointVwc: 10.0,
    currentVwc: 14.8,
    soilTensionKpa: 64.2,
    soilTempC: 25.4,
    canopyTempC: 33.9,
    ambientTempC: 31.0,
    relativeHumidity: 36,
    windSpeedMs: 2.4,
    solarRadiationMj: 26.2,
    ecDsM: 2.35,
    soilPh: 6.1,
    nitrogenPpm: 24,
    phosphorusPpm: 42,
    potassiumPpm: 195,
    ndviScore: 0.61,
    status: 'CRITICAL',
    valveOpen: true,
    fertigationActive: false,
    flowRateLpm: 185,
    lastIrrigated: 'Active Now',
  },
  {
    id: 'zone-c3',
    name: 'Sector C3 · Lower Alluvial Basin',
    crop: 'Triticum aestivum (Winter Wheat)',
    variety: 'Hard Red Winter',
    growthStage: 'Vegetative',
    kc: 0.95,
    areaHectares: 28.0,
    soilType: 'Clay Loam',
    fieldCapacityVwc: 38.0,
    wiltingPointVwc: 18.0,
    currentVwc: 31.6,
    soilTensionKpa: 22.0,
    soilTempC: 19.2,
    canopyTempC: 22.4,
    ambientTempC: 24.1,
    relativeHumidity: 58,
    windSpeedMs: 1.9,
    solarRadiationMj: 19.5,
    ecDsM: 1.18,
    soilPh: 6.8,
    nitrogenPpm: 62,
    phosphorusPpm: 35,
    potassiumPpm: 180,
    ndviScore: 0.86,
    status: 'NOMINAL',
    valveOpen: false,
    fertigationActive: false,
    flowRateLpm: 0,
    lastIrrigated: '14h ago',
  },
  {
    id: 'zone-d4',
    name: 'Sector D4 · South Drip Block',
    crop: 'Glycine max (Soybean)',
    variety: 'Maturity Group III',
    growthStage: 'Flowering / Pollination',
    kc: 1.10,
    areaHectares: 19.8,
    soilType: 'Silt Loam',
    fieldCapacityVwc: 33.0,
    wiltingPointVwc: 13.5,
    currentVwc: 27.9,
    soilTensionKpa: 28.4,
    soilTempC: 21.5,
    canopyTempC: 25.1,
    ambientTempC: 26.8,
    relativeHumidity: 51,
    windSpeedMs: 2.7,
    solarRadiationMj: 22.1,
    ecDsM: 1.32,
    soilPh: 6.5,
    nitrogenPpm: 54,
    phosphorusPpm: 31,
    potassiumPpm: 172,
    ndviScore: 0.82,
    status: 'NOMINAL',
    valveOpen: false,
    fertigationActive: false,
    flowRateLpm: 0,
    lastIrrigated: '22h ago',
  },
];

export const INITIAL_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Root-Zone Depletion Sub-Surface Drip Trigger',
    zoneId: 'zone-a1',
    metric: 'currentVwc',
    operator: '<',
    threshold: 22.0,
    unit: '% VWC',
    actionType: 'OPEN_IRRIGATION_VALVE',
    durationMinutes: 90,
    enabled: true,
    lastTriggered: 'Today, 06:14',
    triggerCount: 4,
  },
  {
    id: 'rule-2',
    name: 'High Tensiometer Matric Stress Emergency Valve',
    zoneId: 'zone-b2',
    metric: 'soilTensionKpa',
    operator: '>',
    threshold: 55.0,
    unit: 'kPa',
    actionType: 'OPEN_IRRIGATION_VALVE',
    durationMinutes: 120,
    enabled: true,
    lastTriggered: 'Today, 11:40',
    triggerCount: 7,
  },
  {
    id: 'rule-3',
    name: 'Canopy Heat-Stress Evaporative Mist Cooling',
    zoneId: 'zone-b2',
    metric: 'canopyTempC',
    operator: '>',
    threshold: 33.0,
    unit: '°C',
    actionType: 'ACTIVATE_MIST_COOLING',
    durationMinutes: 25,
    enabled: true,
    lastTriggered: 'Today, 13:05',
    triggerCount: 3,
  },
  {
    id: 'rule-4',
    name: 'Nitrate Deficit Venturi Fertigation Pulse',
    zoneId: 'zone-a1',
    metric: 'nitrogenPpm',
    operator: '<',
    threshold: 40.0,
    unit: 'ppm NO3-N',
    actionType: 'PULSE_FERTIGATION_INJECTOR',
    durationMinutes: 30,
    enabled: true,
    lastTriggered: 'Yesterday, 17:20',
    triggerCount: 2,
  },
  {
    id: 'rule-5',
    name: 'Field Capacity Saturation Auto-Shutoff',
    zoneId: 'zone-c3',
    metric: 'currentVwc',
    operator: '>=',
    threshold: 33.5,
    unit: '% VWC',
    actionType: 'CLOSE_IRRIGATION_VALVE',
    durationMinutes: 0,
    enabled: true,
    lastTriggered: 'Yesterday, 21:00',
    triggerCount: 11,
  },
];

export const OFFLINE_KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: 'kb-nitrogen',
    category: 'Soil Chemistry',
    title: 'Nitrogen (N) Deficiency & Mobile Chlorosis in Cereals and Row Crops',
    crops: ['Corn', 'Wheat', 'Tomato', 'General'],
    keywords: ['nitrogen', 'yellow', 'chlorosis', 'v-shaped', 'pale', 'lower leaves', 'urea', 'npk', 'fertilizer', 'nitrate', 'ppm'],
    diagnosticCriteria: 'Pale green to yellow discoloration initiating at the tips of older, lower leaves and progressing down the midrib in a characteristic V-shaped pattern. Stems appear thin and spindly.',
    quantitativeThresholds: 'Critical threshold < 35 ppm NO3-N in root zone at V6–VT stage. Optimal leaf tissue N is 2.75%–3.50% dry weight. Soil EC < 0.8 dS/m often correlates with leached nitrate.',
    recommendedAction: 'Side-dress 45–65 kg N/ha using UAN-32 or Urea (46-0-0) via sub-surface fertigation. Split applications prevent nitrate leaching below 60 cm root zone.',
    organicProtocol: 'Apply hydrolyzed fish emulsion (5-1-1) at 15 L/ha through drip venturi or top-dress feather meal (12-0-0) at 250 kg/ha prior to irrigation.',
  },
  {
    id: 'kb-early-blight',
    category: 'Pathology',
    title: 'Early Blight (Alternaria solani) & Concentric Target Lesions',
    crops: ['Tomato', 'Potato', 'Solanaceae'],
    keywords: ['blight', 'spots', 'brown', 'black', 'fungus', 'target', 'rings', 'tomato', 'potato', 'necrosis', 'leaves', 'disease'],
    diagnosticCriteria: 'Dark brown to black necrotic lesions (3–12 mm) on older foliage displaying concentric "bullseye" target rings surrounded by a localized yellow chlorotic halo.',
    quantitativeThresholds: 'High infection risk when canopy temperature is 24°C–29°C with leaf wetness duration > 8 hours or relative humidity > 85%.',
    recommendedAction: 'Eliminate overhead sprinkler wetting; transition strictly to sub-surface or surface drip irrigation. Prune lower 25 cm of canopy to increase sub-canopy airflow.',
    organicProtocol: 'Apply OMRI-listed Copper Octanoate or Bacillus amyloliquefaciens bio-fungicide every 7–10 days when canopy humidity exceeds 75%.',
  },
  {
    id: 'kb-penman-irrigation',
    category: 'Irrigation',
    title: 'FAO-56 Penman-Monteith Evapotranspiration (ETc) & MAD Scheduling',
    crops: ['Corn', 'Tomato', 'Wheat', 'Soybean', 'All Crops'],
    keywords: ['irrigation', 'water', 'moisture', 'vwc', 'evapotranspiration', 'et0', 'etc', 'kpa', 'tension', 'drought', 'wilting', 'schedule', 'when to water'],
    diagnosticCriteria: 'Crop water demand is governed by Reference Evapotranspiration (ET0) multiplied by growth-stage Crop Coefficient (Kc): ETc = ET0 × Kc.',
    quantitativeThresholds: 'Management Allowed Depletion (MAD) is 40% of Total Available Water (TAW) for fruiting vegetables (Tomato) and 50% for deep-rooted grains (Corn/Wheat). Trigger irrigation when Soil Matric Tension exceeds 45–55 kPa in Silt Loam.',
    recommendedAction: 'Calculate net irrigation requirement: Net Depth (mm) = (Field Capacity VWC - Current VWC) × Root Depth (mm) / 100. Divide by system application efficiency (0.90 for drip) to determine gross runtime.',
    organicProtocol: 'Maintain 5–8 cm organic straw or compost mulch to reduce surface soil evaporation (Ke) by 28%–35% and buffer diurnal soil temperature swings.',
  },
  {
    id: 'kb-salinity-ec',
    category: 'Soil Chemistry',
    title: 'Root-Zone Salinity (ECe) Accumulation & Leaching Fraction Calculation',
    crops: ['Tomato', 'Corn', 'Soybean', 'All Crops'],
    keywords: ['salt', 'salinity', 'ec', 'conductivity', 'burn', 'tip burn', 'leaching', 'sodium', 'ph', 'water quality'],
    diagnosticCriteria: 'Marginal leaf scorch, stunted internodes, and dark blue-green foliage despite adequate volumetric water content (osmotic drought stress).',
    quantitativeThresholds: 'Yield decline begins at Soil Saturated Paste ECe > 1.7 dS/m for Corn and > 2.5 dS/m for Tomato. Soil pH > 7.5 locks out Iron, Manganese, and Zinc.',
    recommendedAction: 'Apply a Leaching Requirement (LR) irrigation cycle: LR = ECw / (5 × ECe_threshold - ECw). Run low-salinity irrigation water 15%–20% beyond field capacity to flush sodium and chloride ions below the active root zone.',
    organicProtocol: 'Incorporate agricultural gypsum (Calcium Sulfate, CaSO4·2H2O) at 1.5–2.5 tonnes/ha to displace exchangeable sodium ions on clay micelles.',
  },
  {
    id: 'kb-caterpillar-ipm',
    category: 'Pest Control',
    title: 'Fall Armyworm (Spodoptera frugiperda) & Lepidopteran Defoliation IPM',
    crops: ['Corn', 'Sorghum', 'Soybean', 'Vegetable Crops'],
    keywords: ['pest', 'worm', 'armyworm', 'caterpillar', 'holes', 'chewed', 'insects', 'bugs', 'bt', 'neem', 'whorl'],
    diagnosticCriteria: 'Ragged windowpane feeding holes in emerging whorl leaves accompanied by moist sawdust-like frass plugs deep in the whorl.',
    quantitativeThresholds: 'Economic Threshold (ET): Trigger intervention when >= 20% of whorl-stage plants exhibit fresh feeding damage or >= 1 larva per plant is detected.',
    recommendedAction: 'Target spray applications directly into the whorl during early morning or dusk when larvae actively feed on upper leaf surfaces.',
    organicProtocol: 'Apply Bacillus thuringiensis subsp. kurstaki (Btk) at 1.0–1.5 kg/ha or Spinosad (0.5 L/ha) in high-volume water carrier (300 L/ha) to penetrate the whorl.',
  },
  {
    id: 'kb-phosphorus-potassium',
    category: 'Soil Chemistry',
    title: 'Phosphorus (P) Purpling & Potassium (K) Marginal Necrosis',
    crops: ['Corn', 'Tomato', 'Soybean', 'Wheat'],
    keywords: ['phosphorus', 'potassium', 'purple', 'anthocyanin', 'edges', 'scorch', 'roots', 'fruit quality', 'blossom end rot', 'calcium'],
    diagnosticCriteria: 'Phosphorus deficit causes dark green leaves with purple/reddish anthocyanin accumulation on lower leaf undersides; Potassium deficit causes yellowing and necrosis strictly along outer leaf margins of older leaves.',
    quantitativeThresholds: 'Optimal Mehlich-3 soil Phosphorus: 30–50 ppm. Optimal exchangeable Potassium: 160–220 ppm. Cold soil (< 13°C) severely restricts root P uptake even when soil P is adequate.',
    recommendedAction: 'Band monoammonium phosphate (MAP 11-52-0) near seed furrow or inject soluble monopotassium phosphate (MKP 0-52-34) via drip irrigation during early reproductive stages.',
    organicProtocol: 'Apply micronized soft rock phosphate + mycorrhizal inoculant (Glomus intraradices) for P availability, and sulfate of potash (0-0-50) at 120 kg/ha for K.',
  },
];
