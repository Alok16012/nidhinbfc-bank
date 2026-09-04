"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PassbookPrinterProfile,
  DEFAULT_PRINTER_PROFILE,
} from "@/lib/passbook-print";

interface SettingsPageProps {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default function PassbookPrintSettingsPage({ params, searchParams }: SettingsPageProps) {
  const resolvedParams = use(params);
  const resolvedSearch = use(searchParams);
  const memberId = resolvedParams.memberId;
  const activeTab = resolvedSearch.tab || "all";
  const router = useRouter();

  const [profile, setProfile] = useState<PassbookPrinterProfile>(DEFAULT_PRINTER_PROFILE);
  const [saved, setSaved] = useState(false);

  // Load saved profile
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("passbook-printer-profile");
      if (savedData) {
        setProfile((prev) => ({ ...prev, ...JSON.parse(savedData) }));
      }
    } catch {}
  }, []);

  const handleChange = (field: keyof PassbookPrinterProfile, value: string | number) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("passbook-printer-profile", JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setProfile(DEFAULT_PRINTER_PROFILE);
    localStorage.removeItem("passbook-printer-profile");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-semibold text-slate-700">
                EPSON PLQ-35 Print Settings
              </h1>
              <p className="text-xs text-slate-500">
                Configure printer dimensions and calibration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Reset to Default
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {saved ? "Saved!" : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="space-y-6">
          {/* Printer Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
              Printer Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={profile.brand}
                  onChange={(e) => handleChange("brand", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={profile.model}
                  onChange={(e) => handleChange("model", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Physical Page Dimensions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
              Physical Page Dimensions (mm)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Page Width
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.pageWidthMm}
                  onChange={(e) => handleChange("pageWidthMm", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Page Height
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.pageHeightMm}
                  onChange={(e) => handleChange("pageHeightMm", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Printable Area */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
              Printable Area (mm)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Printable Width
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.printableWidthMm}
                  onChange={(e) => handleChange("printableWidthMm", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Printable Height
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.printableHeightMm}
                  onChange={(e) => handleChange("printableHeightMm", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Calibration */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
              Calibration (mm)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Left Offset
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.leftOffsetMm}
                  onChange={(e) => handleChange("leftOffsetMm", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Top Offset
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.topOffsetMm}
                  onChange={(e) => handleChange("topOffsetMm", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
              Typography
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Font Family
                </label>
                <select
                  value={profile.fontFamily}
                  onChange={(e) => handleChange("fontFamily", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                >
                  <option value="Courier New">Courier New</option>
                  <option value="Courier">Courier</option>
                  <option value="monospace">Monospace</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Font Size (pt)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="6"
                  max="14"
                  value={profile.fontSizePt}
                  onChange={(e) => handleChange("fontSizePt", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Line Height (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="2"
                  max="10"
                  value={profile.lineHeightMm}
                  onChange={(e) => handleChange("lineHeightMm", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Row Height (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="2"
                  max="10"
                  value={profile.rowHeightMm}
                  onChange={(e) => handleChange("rowHeightMm", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Character Pitch (chars per 10mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="8"
                  max="20"
                  value={profile.characterPitch}
                  onChange={(e) => handleChange("characterPitch", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-blue-900 mb-2">
              EPSON PLQ-35 Calibration Guide
            </h3>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Print a calibration page and measure the actual printed position</li>
              <li>Adjust Left/Top Offset to align with passbook pre-printed lines</li>
              <li>Horizontal Offset: moves entire layout left/right</li>
              <li>Top Offset: moves entire layout up/down</li>
              <li>Page dimensions should remain 170 x 105 mm</li>
              <li>Font size 8-9pt recommended for dot-matrix printing</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <a
              href={`/passbook/${memberId}/print?tab=${activeTab}`}
              className="flex-1 text-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue to Print
            </a>
            <a
              href={`/passbook/${memberId}`}
              className="px-4 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Back to Passbook
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
