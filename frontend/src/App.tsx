import { useCallback, useRef, useState, type CSSProperties } from "react";
import "./App.css";

const PREVIEW_BACKDROPS = [
  { id: "gray", label: "Gray", value: "#e8e8ed" },
  { id: "white", label: "White", value: "#ffffff" },
  { id: "dark", label: "Dark", value: "#1c1c22" },
  { id: "mint", label: "Mint", value: "#d4f5e9" },
] as const;

export default function App() {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewBg, setPreviewBg] = useState<string>(PREVIEW_BACKDROPS[0].value);
  const inputRef = useRef<HTMLInputElement>(null);

  const revoke = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const reset = useCallback(() => {
    setOriginalUrl((prev) => {
      revoke(prev);
      return null;
    });
    setResultUrl((prev) => {
      revoke(prev);
      return null;
    });
    setFileName("");
    setError(null);
  }, [revoke]);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setOriginalUrl((prev) => {
        revoke(prev);
        return URL.createObjectURL(file);
      });
      setResultUrl((prev) => {
        revoke(prev);
        return null;
      });
      setFileName(file.name);
      setLoading(true);

      const form = new FormData();
      form.append("file", file);

      try {
        const res = await fetch("/api/remove-background", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(
            typeof err.detail === "string" ? err.detail : "Processing failed",
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
    [revoke],
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

  const hasImage = Boolean(originalUrl);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span>tryon.rvw</span>
        </div>
        <h1 className="title">AI Image Editor</h1>
      </header>

      <nav className="tools" aria-label="Tools">
        <button type="button" className="tool active" aria-current="page">
          Background
        </button>
        <button type="button" className="tool" disabled title="Coming soon">
          Retouch
        </button>
        <button type="button" className="tool" disabled title="Coming soon">
          Expand
        </button>
        <button type="button" className="tool" disabled title="Coming soon">
          Upscale
        </button>
      </nav>

      <main className="workspace">
        {!hasImage ? (
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
              <>
                <div className="spinner" />
                <p className="drop-heading">Removing background…</p>
                <p className="drop-hint">bria-rmbg on your machine</p>
              </>
            ) : (
              <>
                <div className="drop-icon" aria-hidden>
                  ↑
                </div>
                <p className="drop-heading">Drop or choose images</p>
                <p className="drop-hint">JPEG, PNG, WebP · up to 15 MB</p>
              </>
            )}
          </section>
        ) : (
          <section className="editor">
            <div className="editor-toolbar">
              <button type="button" className="link-btn" onClick={reset}>
                New image
              </button>
              {resultUrl && (
                <button type="button" className="btn primary" onClick={download}>
                  Download PNG
                </button>
              )}
            </div>

            <div className="panes">
              <figure className="pane">
                <figcaption>Original</figcaption>
                <div className="pane-body">
                  {originalUrl && <img src={originalUrl} alt="Original upload" />}
                </div>
              </figure>

              <figure className="pane result-pane">
                <figcaption>
                  <span>Background removed</span>
                  <span className="caption-note">transparent PNG · real alpha</span>
                </figcaption>
                <div className="pane-body preview-stage">
                  {loading && (
                    <div className="stage-overlay">
                      <div className="spinner" />
                      <p>Removing background…</p>
                    </div>
                  )}
                  {resultUrl ? (
                    <div
                      className="cutout-frame"
                      style={{ "--preview-bg": previewBg } as CSSProperties}
                    >
                      <img src={resultUrl} alt="Background removed" />
                    </div>
                  ) : (
                    !loading && (
                      <p className="stage-empty">Processing failed or waiting…</p>
                    )
                  )}
                </div>
              </figure>
            </div>

            {resultUrl && (
              <div className="backdrop-picker" aria-label="Preview backdrop">
                <span className="picker-label">Preview on</span>
                {PREVIEW_BACKDROPS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`swatch ${previewBg === opt.value ? "active" : ""}`}
                    style={{ background: opt.value }}
                    title={opt.label}
                    aria-label={`Preview on ${opt.label}`}
                    aria-pressed={previewBg === opt.value}
                    onClick={() => setPreviewBg(opt.value)}
                  />
                ))}
                <span className="picker-note">
                  Downloaded file has no backdrop — only transparency, like an Apple sticker.
                </span>
              </div>
            )}
          </section>
        )}

        {error && <p className="banner error">{error}</p>}
        {!hasImage && error === null && (
          <p className="banner hint">
            Run <code>npm run dev</code> to start the local bria-rmbg engine.
          </p>
        )}
      </main>
    </div>
  );
}
