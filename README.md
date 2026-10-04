# TerraLocal

An offline-first agricultural AI and field automation platform designed for farmers operating in low- or zero-connectivity environments.

Key Capabilities Built
Offline-First PWA & Air-Gapped Field Mode: Configured with a Service Worker, installable Web App Manifest, and an in-app Install Field App button plus an Air-Gapped Field Mode switch in the header so all core tools operate 100% locally without an internet connection.

On-Device Optical Crop Health & Leaf Spectral Scanner (Crop Vision AI): Analyzes crop foliage directly on an HTML5 Canvas using pixel-level spectral indices (VARI — Visible Atmospherically Resistant Index, and ExG — Excess Green Index), quantifies healthy chlorophyll lamina %, chlorotic tissue %, and necrotic lesion clusters, and dispatches automated remedies directly to field actuators. Supports calibrated field specimens, photo uploads, live camera capture, and optional hybrid verification with server-side Gemini Vision when online.

FAO-56 Penman-Monteith Irrigation Predictor (Irrigation Forecast): Computes daily Reference Evapotranspiration (
), Crop Evapotranspiration (
), and Vapor Pressure Deficit (
) locally. Includes interactive temperature anomaly and precipitation scrubbers, a dual-curve 7-day root-zone Volumetric Water Content (
) chart, Management Allowed Depletion (
) triggers, and one-click precision drip refill execution.

Field Agronomist Q&A & Offline Corpus (Agronomist Q&A): Answers natural-language farming questions by synthesizing live sector telemetry (
, soil tension 
, 
, 
, 
) with an embedded offline agronomic field manual covering crop pathology, NPK dosing, salinity leaching calculations, and organic IPM—plus optional hybrid cloud Gemini 3.8 Flash synthesis when connected.

Closed-Loop Field Automation PLC (Automation PLC): Evaluates real-time sensor thresholds against programmable rules to automatically actuate sub-surface drip solenoid valves, Venturi NPK fertigation injectors, and canopy mist cooling systems, logging all actions to persistent local storage.
