"use client";

import { Toaster } from "sonner";

/** App-wide pop-up messages (see lib/notify.ts) — dark pill like the mobile app's toast. */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      offset={{ bottom: 24 }}
      mobileOffset={{ bottom: "calc(92px + env(safe-area-inset-bottom))", left: 16, right: 16 }}
      duration={3500}
      closeButton
      // Sonner's theme colours, so every toast is the dark pill
      style={{ "--normal-bg": "#0f1729", "--normal-text": "#ffffff", "--normal-border": "transparent" } as React.CSSProperties}
      toastOptions={{
        classNames: { toast: "gn-toast", success: "gn-toast-success", error: "gn-toast-error", description: "gn-toast-desc" },
      }}
    />
  );
}
