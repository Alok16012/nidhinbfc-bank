package com.grihsevak.nidhi;

import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Hosts the Grihsevak Nidhi web app (server.url in capacitor.config.json).
 * A WebView can't print or save blob downloads by itself, so the page's
 * NativeBridge component (components/NativeBridge.tsx) calls `AndroidBridge`.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        // Plain http(s) downloads go to the system (browser / download manager).
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url.startsWith("http")) openExternally(Uri.parse(url), null);
        });
    }

    private void openExternally(Uri uri, String mimeType) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        if (mimeType != null) intent.setDataAndType(uri, mimeType); else intent.setData(uri);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException ignored) {
            // Nothing installed that opens this file type; it is still in Downloads.
        }
    }

    private class AndroidBridge {

        /** window.print() → Android print dialog (printers or "Save as PDF"). */
        @JavascriptInterface
        public void print() {
            runOnUiThread(() -> {
                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                WebView webView = getBridge().getWebView();
                printManager.print(
                    "Grihsevak Nidhi",
                    webView.createPrintDocumentAdapter("Grihsevak Nidhi"),
                    new PrintAttributes.Builder().build()
                );
            });
        }

        /** Saves a file the page generated (e.g. a passbook PDF) to Downloads and opens it. */
        @JavascriptInterface
        public void saveFile(String base64, String fileName, String mimeType) {
            String name = fileName.replaceAll("[\\\\/:*?\"<>|]", "_");
            try {
                byte[] data = Base64.decode(base64, Base64.DEFAULT);
                Uri uri;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                    uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) throw new IllegalStateException("No Downloads collection");
                    try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                        if (out == null) throw new IllegalStateException("Cannot write file");
                        out.write(data);
                    }
                } else {
                    // Older Android: the app's own Downloads folder needs no storage permission.
                    File file = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), name);
                    try (FileOutputStream out = new FileOutputStream(file)) {
                        out.write(data);
                    }
                    uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", file);
                }
                Uri saved = uri;
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "Saved to Downloads: " + name, Toast.LENGTH_LONG).show();
                    openExternally(saved, mimeType);
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Could not save " + name, Toast.LENGTH_LONG).show());
            }
        }
    }
}
