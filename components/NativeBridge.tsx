"use client";

import { useEffect } from "react";

interface AndroidBridge {
  print: () => void;
  saveFile: (base64: string, fileName: string, mimeType: string) => void;
}

/**
 * Inside the Android app the WebView can't print or save blob downloads on its
 * own, so hand both to the app's native `AndroidBridge` (see android-app/).
 * In a normal browser the bridge is absent and nothing changes.
 */
export function NativeBridge() {
  useEffect(() => {
    const native = (window as unknown as { AndroidBridge?: AndroidBridge }).AndroidBridge;
    if (!native) return;

    window.print = () => native.print();

    // Pages build PDFs as blobs and click a temporary <a download>, revoking the
    // URL right after — so remember each blob when its URL is created.
    const blobs = new Map<string, Blob>();
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (obj: Blob | MediaSource) => {
      const url = createObjectURL(obj);
      if (obj instanceof Blob) blobs.set(url, obj);
      return url;
    };

    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      const blob = this.href.startsWith("blob:") ? blobs.get(this.href) : undefined;
      if (!blob) return click.call(this);
      blobs.delete(this.href);
      const name = this.download || "download";
      const reader = new FileReader();
      reader.onload = () => native.saveFile(String(reader.result).split(",")[1] ?? "", name, blob.type || "application/octet-stream");
      reader.readAsDataURL(blob);
    };
  }, []);

  return null;
}
