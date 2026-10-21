"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Drop-in for a hidden `<input type="file">` opened by a `<label htmlFor>`.
 * On touch devices (phones, the Android app) it first asks where the file
 * should come from — camera, gallery or (when PDFs are allowed) files —
 * because a plain file input goes straight to the gallery there.
 * With a mouse it behaves like the normal file picker.
 */
export function UploadInput({ accept = "image/*", onChange, disabled, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);

  const takesImages = accept.split(",").some((t) => t.trim().startsWith("image"));
  const takesDocs = accept.split(",").some((t) => !t.trim().startsWith("image"));

  const ask = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!takesImages || !window.matchMedia("(pointer: coarse)").matches) return;
    e.preventDefault();
    setOpen(true);
  };

  const pick = (ref: React.RefObject<HTMLInputElement | null>) => {
    setOpen(false);
    const input = ref.current;
    if (!input) return;
    input.value = ""; // so picking the same file again still fires onChange
    input.click();
  };

  const stroke = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "var(--blue)", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <>
      <input type="file" accept={accept} onChange={onChange} onClick={ask} disabled={disabled} {...rest} />
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={onChange} hidden tabIndex={-1} />
      <input ref={gallery} type="file" accept="image/*" onChange={onChange} hidden tabIndex={-1} />
      {takesDocs && <input ref={files} type="file" accept={accept} onChange={onChange} hidden tabIndex={-1} />}

      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Upload from" onClick={() => setOpen(false)} className="m-app" style={{
          position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,41,0.45)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div onClick={(e) => e.stopPropagation()} className="sheet-up" style={{
            width: "100%", maxWidth: 430, background: "var(--app-bg)", borderRadius: "24px 24px 0 0",
            padding: "10px 16px calc(20px + env(safe-area-inset-bottom))",
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--line-strong)", margin: "0 auto 12px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>Upload from</h3>
              <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer" }}>Cancel</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <SourceOption label="Take Photo" hint="Use the camera" onClick={() => pick(camera)} icon={
                <svg {...stroke}><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z" /><circle cx="12" cy="12.8" r="3.6" /></svg>
              } />
              <SourceOption label="Choose from Gallery" hint="Pick an existing photo" onClick={() => pick(gallery)} icon={
                <svg {...stroke}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="9.5" r="1.6" /><path d="M20.5 15.5l-4.8-4.8L6 19.5" /></svg>
              } />
              {takesDocs && (
                <SourceOption label="Choose a File" hint="PDF or document" onClick={() => pick(files)} icon={
                  <svg {...stroke}><path d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9z" /><path d="M14 3.5V9h5.5" /></svg>
                } />
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** One row in the "Upload from" sheet. */
function SourceOption({ label, hint, icon, onClick }: { label: string; hint: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="press" style={{
      width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "13px 14px", textAlign: "left",
      background: "var(--surface)", border: "none", borderRadius: 16, boxShadow: "var(--shadow-card)", cursor: "pointer",
    }}>
      <span style={{ width: 42, height: 42, borderRadius: 13, background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span>
        <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--ink-soft)" }}>{hint}</span>
      </span>
    </button>
  );
}
