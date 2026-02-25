"use client";

import { useEffect, useRef, useState } from "react";
import type { Annotation } from "@/types/agent";

interface ModelViewerProps {
  modelUrl: string | null;
  annotations?: Annotation[];
  isLoading?: boolean;
  className?: string;
}

// Track whether the model-viewer script has been loaded globally
let scriptLoaded = false;
let scriptLoadPromise: Promise<void> | null = null;

function ensureModelViewerScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve) => {
    // Already defined (e.g. loaded in a previous navigation)
    if (typeof customElements !== "undefined" && customElements.get("model-viewer")) {
      scriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
    script.onload = () => {
      // Wait for the custom element to actually register
      customElements.whenDefined("model-viewer").then(() => {
        scriptLoaded = true;
        resolve();
      });
    };
    script.onerror = () => {
      console.error("[ModelViewer] Failed to load model-viewer script");
      resolve(); // resolve anyway so we don't hang
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function ModelViewer({
  modelUrl,
  annotations = [],
  isLoading,
  className,
}: ModelViewerProps) {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(scriptLoaded);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load the model-viewer script once
  useEffect(() => {
    if (!ready) {
      ensureModelViewerScript().then(() => setReady(true));
    }
  }, [ready]);

  // Create/update the model-viewer element imperatively
  useEffect(() => {
    const container = viewerContainerRef.current;
    if (!container || !ready || !modelUrl) return;

    console.log("[ModelViewer] Rendering model:", modelUrl);
    setLoadError(null);

    // Remove old viewer if exists
    const existing = container.querySelector("model-viewer");
    if (existing) {
      existing.setAttribute("src", modelUrl);
      return;
    }

    // Create fresh model-viewer element
    const mv = document.createElement("model-viewer") as any;
    mv.src = modelUrl;
    mv.alt = "Generated 3D educational model";
    mv.setAttribute("camera-controls", "");
    mv.setAttribute("auto-rotate", "");
    mv.setAttribute("ar", "");
    mv.setAttribute("ar-modes", "webxr scene-viewer quick-look");
    mv.setAttribute("shadow-intensity", "1");
    mv.setAttribute("tone-mapping", "neutral");
    mv.style.cssText = "width:100%;height:100%;display:block;min-height:400px;";

    mv.addEventListener("error", () => {
      console.error("[ModelViewer] model-viewer error loading:", modelUrl);
      setLoadError("Failed to load 3D model");
    });

    mv.addEventListener("load", () => {
      console.log("[ModelViewer] Model loaded successfully");
    });

    container.appendChild(mv);

    return () => {
      // Cleanup on unmount
      if (container.contains(mv)) {
        container.removeChild(mv);
      }
    };
  }, [modelUrl, ready]);

  // --- Empty state ---
  if (!modelUrl && !isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl ${className}`}
      >
        <div className="text-center p-8">
          <div className="text-6xl mb-4 opacity-30">🎮</div>
          <h3 className="text-lg font-medium text-gray-500">3D Viewer</h3>
          <p className="text-sm text-gray-400 mt-1">
            Enter a prompt below to generate XR content
          </p>
        </div>
      </div>
    );
  }

  // --- Loading state (no model yet) ---
  if (isLoading && !modelUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl ${className}`}
      >
        <div className="text-center p-8">
          <div className="animate-spin text-4xl mb-3">⏳</div>
          <p className="text-sm text-gray-500">Generating 3D model...</p>
        </div>
      </div>
    );
  }

  // --- Model viewer ---
  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-gray-100 ${className}`}
    >
      {/* The model-viewer element is appended here by useEffect */}
      <div
        ref={viewerContainerRef}
        style={{ width: "100%", height: "100%", minHeight: 400 }}
      />

      {/* Error fallback */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-4">
            <p className="text-sm text-red-500 mb-2">{loadError}</p>
            <a
              href={modelUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline"
            >
              Open model file directly
            </a>
          </div>
        </div>
      )}

      {/* Script not ready indicator */}
      {!ready && modelUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-sm text-gray-400">Loading 3D viewer engine...</p>
        </div>
      )}

      {/* Annotation overlay */}
      {annotations.length > 0 && (
        <div className="absolute top-3 right-3 max-w-xs space-y-2 z-10">
          {annotations.slice(0, 3).map((ann) => (
            <div
              key={ann.id}
              className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200"
            >
              <p className="text-xs font-semibold text-gray-800">{ann.label}</p>
              <p className="text-[10px] text-gray-600 line-clamp-2">
                {ann.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Debug: show model URL (remove in production) */}
      {modelUrl && (
        <div className="absolute bottom-2 left-2 z-10">
          <p className="text-[9px] text-gray-400 bg-black/50 text-white px-2 py-1 rounded font-mono max-w-[300px] truncate">
            {modelUrl}
          </p>
        </div>
      )}
    </div>
  );
}
