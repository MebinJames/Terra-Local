import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload, ScanLine, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  CropDiagnosisResult,
  FieldZone,
} from '../data/agronomyData';
import {
  SyntheticSpecimenPreset,
  analyzeLeafCanvasLocally,
  renderSyntheticLeafSpecimenToCanvas,
} from '../services/localAgronomyEngine';

interface CropVisionScannerProps {
  activeZone: FieldZone;
  isOnline: boolean;
  onDiagnosisComplete: (result: CropDiagnosisResult) => void;
  onApplyAutomatedRemedy: (result: CropDiagnosisResult) => void;
}

const SPECIMEN_PRESETS: { id: SyntheticSpecimenPreset; label: string; subtitle: string }[] = [
  {
    id: 'NITROGEN_CHLOROSIS',
    label: 'Specimen 01 · Nitrogen Chlorosis',
    subtitle: 'V-shaped apical yellowing on lower lamina',
  },
  {
    id: 'EARLY_BLIGHT_LESIONS',
    label: 'Specimen 02 · Early Blight (A. solani)',
    subtitle: 'Concentric target necrotic rings + halo',
  },
  {
    id: 'POTASSIUM_MARGINAL_SCORCH',
    label: 'Specimen 03 · Potassium Scorch',
    subtitle: 'Outer margin necrosis & osmotic stress',
  },
  {
    id: 'HEALTHY_TURGID_CANOPY',
    label: 'Specimen 04 · Healthy Canopy',
    subtitle: 'Uniform chlorophyll reflectance control',
  },
];

export const CropVisionScanner: React.FC<CropVisionScannerProps> = ({
  activeZone,
  isOnline,
  onDiagnosisComplete,
  onApplyAutomatedRemedy,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [selectedPreset, setSelectedPreset] = useState<SyntheticSpecimenPreset>('NITROGEN_CHLOROSIS');
  const [diagnosis, setDiagnosis] = useState<CropDiagnosisResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCloudVerifying, setIsCloudVerifying] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [remedyApplied, setRemedyApplied] = useState(false);

  const runLocalScanOnCurrentCanvas = (presetToRender?: SyntheticSpecimenPreset) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsScanning(true);
    setRemedyApplied(false);
    setStatusMessage(null);

    if (presetToRender) {
      renderSyntheticLeafSpecimenToCanvas(canvas, presetToRender);
    }

    window.setTimeout(() => {
      const result = analyzeLeafCanvasLocally(canvas, activeZone, true);
      setDiagnosis(result);
      onDiagnosisComplete(result);
      setIsScanning(false);
    }, 140);
  };

  useEffect(() => {
    runLocalScanOnCurrentCanvas(selectedPreset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset, activeZone.id]);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, []);

  const handlePresetClick = (preset: SyntheticSpecimenPreset) => {
    if (cameraActive) stopCamera();
    setSelectedPreset(preset);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current) return;
    if (cameraActive) stopCamera();

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const result = analyzeLeafCanvasLocally(canvas, activeZone, true);
        setDiagnosis(result);
        onDiagnosisComplete(result);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      setStatusMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setStatusMessage('Camera hardware unavailable in this browser environment. Using calibrated field specimen presets.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureCameraFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    stopCamera();
    const result = analyzeLeafCanvasLocally(canvas, activeZone, true);
    setDiagnosis(result);
    onDiagnosisComplete(result);
  };

  const handleHybridCloudVerify = async () => {
    if (!canvasRef.current || !diagnosis) return;
    if (!isOnline) {
      setStatusMessage('Air-Gapped Offline Mode is active. Local Edge Spectral Vision diagnosis is already verified on-device.');
      return;
    }

    setIsCloudVerifying(true);
    setStatusMessage(null);
    try {
      const imageBase64 = canvasRef.current.toDataURL('image/png');
      const res = await fetch('/api/agronomist/diagnose-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: 'image/png',
          cropType: activeZone.crop,
          localMetrics: diagnosis.spectralMetrics,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.diagnosis) {
        throw new Error(data.error || 'Cloud verification failed');
      }
      const updated: CropDiagnosisResult = {
        ...diagnosis,
        conditionName: data.diagnosis.conditionName || diagnosis.conditionName,
        severity: data.diagnosis.severity || diagnosis.severity,
        confidencePct: data.diagnosis.confidencePct || diagnosis.confidencePct,
        causalAgent: data.diagnosis.causalAgent || diagnosis.causalAgent,
        physiologicalImpact: data.diagnosis.physiologicalImpact || diagnosis.physiologicalImpact,
        treatmentSteps:
          Array.isArray(data.diagnosis.treatmentSteps) && data.diagnosis.treatmentSteps.length > 0
            ? data.diagnosis.treatmentSteps
            : diagnosis.treatmentSteps,
        engineUsed: data.engine || 'Hybrid Edge + Gemini 3.8 Vision',
      };
      setDiagnosis(updated);
      onDiagnosisComplete(updated);
    } catch (err: any) {
      setStatusMessage(err?.message || 'Cloud endpoint unreachable — retaining 100% On-Device Edge Spectral classification.');
    } finally {
      setIsCloudVerifying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Optical Specimen Viewport & Preset Selector */}
      <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-100">
                On-Device Optical Leaf Spectral Analyzer
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Zone: {activeZone.name} · {activeZone.crop}
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              ● EDGE WASM/CANVAS
            </span>
          </div>

          {/* Specimen Preset Selector */}
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Select Calibrated Field Specimen or Capture Live Foliage:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SPECIMEN_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset.id)}
                  className={`text-left p-2.5 rounded-md border transition-colors cursor-pointer ${
                    selectedPreset === preset.id && !cameraActive
                      ? 'bg-emerald-950/40 border-emerald-500/70 text-slate-100'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold truncate">{preset.label}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{preset.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Canvas / Camera Stage */}
          <div className="mt-4 relative rounded-lg overflow-hidden border border-slate-800 bg-[#0B0F17]">
            <canvas
              ref={canvasRef}
              width={440}
              height={300}
              className={`w-full h-[260px] object-contain cursor-crosshair ${cameraActive ? 'hidden' : 'block'}`}
            />
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-[260px] object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {/* Corner HUD Coordinates & Legend */}
            <div className="absolute top-2.5 left-2.5 bg-slate-950/85 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono text-slate-300">
              <span>FOV: 440×300px</span>
              <span className="mx-1.5">·</span>
              <span className="text-amber-400">□ Chlorosis ROI</span>
              <span className="mx-1.5">·</span>
              <span className="text-rose-400">○ Necrotic Lesion</span>
            </div>

            {isScanning && (
              <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                <div className="text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <ScanLine className="w-4 h-4 animate-spin" />
                  <span>COMPUTING PIXEL SPECTRAL INDICES (VARI / ExG)...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Camera & Upload Controls */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Leaf Photo</span>
            </button>

            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Field Camera</span>
              </button>
            ) : (
              <button
                onClick={captureCameraFrame}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture & Analyze</span>
              </button>
            )}
          </div>

          <button
            onClick={() => runLocalScanOnCurrentCanvas(selectedPreset)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Re-Scan Specimen</span>
          </button>
        </div>
      </div>

      {/* Right Column: Quantitative Spectral Telemetry & Pathology Diagnosis */}
      <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
        {diagnosis ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono text-slate-400">
                  DIAGNOSTIC REPORT · {diagnosis.timestamp} · {diagnosis.engineUsed}
                </div>
                <h3 className="text-lg font-display font-semibold text-slate-100 mt-1">
                  {diagnosis.conditionName}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {diagnosis.severity === 'NOMINAL' && (
                  <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>● NOMINAL ({diagnosis.confidencePct}% CONFIDENCE)</span>
                  </span>
                )}
                {diagnosis.severity === 'MODERATE' && (
                  <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>▲ MODERATE STRESS ({diagnosis.confidencePct}% CONFIDENCE)</span>
                  </span>
                )}
                {diagnosis.severity === 'CRITICAL' && (
                  <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>✖ CRITICAL PATHOLOGY ({diagnosis.confidencePct}% CONFIDENCE)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Spectral Telemetry Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#0B0F17] p-3.5 rounded-lg border border-slate-800/90">
              <div>
                <div className="text-[11px] text-slate-400">Healthy Lamina</div>
                <div className="mt-1 flex items-baseline">
                  <span className="text-xl font-mono font-semibold text-emerald-400 tabular-nums">
                    {diagnosis.spectralMetrics.greenFraction}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1">%</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">Chlorotic Tissue</div>
                <div className="mt-1 flex items-baseline">
                  <span className="text-xl font-mono font-semibold text-amber-400 tabular-nums">
                    {diagnosis.spectralMetrics.chlorosisFraction}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1">%</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">Necrotic Area</div>
                <div className="mt-1 flex items-baseline">
                  <span className="text-xl font-mono font-semibold text-rose-400 tabular-nums">
                    {diagnosis.spectralMetrics.necrosisFraction}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1">%</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">VARI Reflectance</div>
                <div className="mt-1 flex items-baseline">
                  <span className="text-xl font-mono font-semibold text-cyan-400 tabular-nums">
                    {diagnosis.spectralMetrics.variIndex}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1">idx</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">Lesion Clusters</div>
                <div className="mt-1 flex items-baseline">
                  <span className="text-xl font-mono font-semibold text-slate-100 tabular-nums">
                    {diagnosis.spectralMetrics.lesionClusterCount}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1">ROIs</span>
                </div>
              </div>
            </div>

            {/* Causal Agent & Physiological Impact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-md bg-slate-900/70 border border-slate-800">
                <div className="font-semibold text-slate-200 mb-1">Primary Causal Agent</div>
                <p className="text-slate-400 leading-relaxed">{diagnosis.causalAgent}</p>
              </div>
              <div className="p-3.5 rounded-md bg-slate-900/70 border border-slate-800">
                <div className="font-semibold text-slate-200 mb-1">Physiological & Yield Impact</div>
                <p className="text-slate-400 leading-relaxed">{diagnosis.physiologicalImpact}</p>
              </div>
            </div>

            {/* Actionable Agronomic Protocol */}
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-2">
                Prescribed Agronomic & Automated Intervention Steps:
              </h4>
              <div className="space-y-2">
                {diagnosis.treatmentSteps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-2.5 rounded-md bg-[#0B0F17] border border-slate-800 text-xs text-slate-300"
                  >
                    <span className="font-mono font-semibold text-emerald-400 shrink-0">
                      0{i + 1}.
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {statusMessage && (
              <div className="p-2.5 rounded-md bg-slate-900 border border-slate-700 text-xs text-amber-300 font-mono">
                {statusMessage}
              </div>
            )}
          </div>
        ) : null}

        {/* Bottom Action Bar */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleHybridCloudVerify}
            disabled={isCloudVerifying}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {isCloudVerifying
                ? 'Cross-Checking with Gemini Vision...'
                : 'Optional: Verify with Cloud Gemini Vision'}
            </span>
          </button>

          {diagnosis && (
            <button
              onClick={() => {
                onApplyAutomatedRemedy(diagnosis);
                setRemedyApplied(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>
                {remedyApplied
                  ? '✓ Remedy Dispatched to Field Actuators'
                  : `Execute Prescribed Remedy on ${activeZone.name}`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
