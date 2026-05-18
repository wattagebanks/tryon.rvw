import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

type ModelChoice = "gpt-image" | "dall-e-3";

type Health = {
  runtime?: string;
  providers: {
    local: { available: boolean; label: string };
    litellm: {
      available: boolean;
      label: string;
      model?: string;
      models?: Record<ModelChoice, { id: string; label: string }>;
    };
  };
  default_provider: string;
  default_model?: ModelChoice;
};

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [model, setModel] = useState<ModelChoice>("gpt-image");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data: Health) => {
        setHealth(data);
        if (
          data.default_model === "dall-e-3" ||
          data.default_model === "gpt-image"
        ) {
          setModel(data.default_model);
        }
      })
      .catch(() => setHealth(null));
  }, []);

  const revoke = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const resetResult = useCallback(() => {
    setResultUrl((prev) => {
      revoke(prev);
      return null;
    });
    setError(null);
  }, [revoke]);

  const processFile = useCallback(
    async (file: File) => {
      resetResult();
      setOriginalUrl((prev) => {
        revoke(prev);
        return URL.createObjectURL(file);
      });
      setFileName(file.name);
      setLoading(true);

      const form = new FormData();
      form.append("file", file);
      form.append("model", model);
      form.append("background_color", bgColor);

      try {
        const res = await fetch("/api/remove-background", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(
            typeof err.detail === "string"
              ? err.detail
              : typeof err.error === "string"
                ? err.error
                : "Processing failed",
          );
        }
        const blob = await res.blob();
        setResultUrl(URL.createObjectURL(blob));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [model, bgColor, resetResult, revoke],
  );

  const onFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file?.type.startsWith("image/")) void processFile(file);
    },
    [processFile],
  );

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = fileName.replace(/\.[^.]+$/, "") + "-no-bg.png";
    a.click();
  };

  const litellmAvailable = health?.providers.litellm.available ?? false;
  const modelMeta = health?.providers.litellm.models;

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-mark" />
          <span>tryon.rvw</span>
        </div>
        <p className="tagline">
          AI background removal · opaque PNG on solid white
        </p>
      </header>

      <main className="main">
        <section
          className={`dropzone ${dragOver ? "drag-over" : ""} ${loading ? "loading" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
          onClick={() => !loading && inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => onFiles(e.target.files)}
          />
          {loading ? (
            <div className="drop-content">
              <div className="spinner" />
              <p>Removing background…</p>
              <p className="muted">
                {model === "gpt-image" ? "GPT Image" : "DALL-E 3"} via LiteLLM
              </p>
            </div>
          ) : (
            <div className="drop-content">
              <div className="upload-icon">↑</div>
              <p className="drop-title">Drop an image or click to upload</p>
              <p className="muted">JPEG, PNG, WebP · up to 15 MB</p>
            </div>
          )}
        </section>

        <div className="controls">
          <label className="control">
            <span>Model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ModelChoice)}
              disabled={loading || !litellmAvailable}
            >
              <option value="gpt-image">
                GPT Image
                {modelMeta?.["gpt-image"]?.id
                  ? ` (${modelMeta["gpt-image"].id})`
                  : ""}
              </option>
              <option value="dall-e-3">
                DALL-E 3
                {modelMeta?.["dall-e-3"]?.id
                  ? ` (${modelMeta["dall-e-3"].id})`
                  : ""}
              </option>
            </select>
          </label>
          <label className="control">
            <span>Background</span>
            <div className="color-row">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                disabled={loading}
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                disabled={loading}
                spellCheck={false}
              />
            </div>
          </label>
        </div>

        {!litellmAvailable && health && (
          <p className="error">
            LiteLLM is not configured on the server. Set LITELLM_API_KEY in
            Cloudflare.
          </p>
        )}

        {error && <p className="error">{error}</p>}

        {(originalUrl || resultUrl) && (
          <section className="preview-grid">
            <figure className="preview-card">
              <figcaption>Original</figcaption>
              {originalUrl && <img src={originalUrl} alt="Original upload" />}
            </figure>
            <figure className="preview-card result">
              <figcaption>Result</figcaption>
              {resultUrl ? (
                <img src={resultUrl} alt="Background removed" />
              ) : (
                <div className="preview-placeholder">
                  {loading ? "Processing…" : "Upload to see result"}
                </div>
              )}
            </figure>
          </section>
        )}

        {resultUrl && (
          <div className="actions">
            <button type="button" className="btn primary" onClick={download}>
              Download PNG
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => inputRef.current?.click()}
            >
              Try another image
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
