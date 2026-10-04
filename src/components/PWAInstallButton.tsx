import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Install TerraLocal AgOS for 100% Offline Field Use"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install Field App</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
        <span>{isIOS ? 'Install on iOS' : 'Offline App Setup'}</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-lg bg-[#111827] border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-display font-semibold text-slate-100">
                Install TerraLocal AgOS for Offline Field Operation
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p className="text-xs text-slate-400 leading-relaxed">
                TerraLocal caches the entire agronomic neural knowledge base, FAO-56 Penman-Monteith evapotranspiration engine, and leaf spectral classifier directly on your device via Service Worker.
              </p>

              {isIOS ? (
                <div className="p-3.5 rounded-md bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="font-semibold text-emerald-400">iPhone / iPad Safari Instructions:</div>
                  <p>1. Tap the <strong>Share</strong> icon in your Safari toolbar.</p>
                  <p>2. Scroll down and select <strong>Add to Home Screen</strong>.</p>
                  <p>3. Launch TerraLocal directly from your home screen with zero cellular signal required.</p>
                </div>
              ) : (
                <div className="p-3.5 rounded-md bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="font-semibold text-emerald-400">Desktop / Android Field Tablet Instructions:</div>
                  <p>1. Click the <strong>Install App</strong> icon in your browser&apos;s address bar (or open Browser Menu &rarr; <strong>Install TerraLocal AgOS</strong>).</p>
                  <p>2. If viewing inside a preview frame, open the application in a standalone browser tab to trigger native OS installation.</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium bg-emerald-500 text-slate-950 rounded-md hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
