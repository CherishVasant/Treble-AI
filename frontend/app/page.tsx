"use client";

import { useState, useRef, useEffect } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

const BACKEND = "http://localhost:8000";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [musicXmlBuffer, setMusicXmlBuffer] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const osmdContainerRef = useRef<HTMLDivElement>(null);
  const osmdInstanceRef = useRef<OpenSheetMusicDisplay | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!musicXmlBuffer || !osmdContainerRef.current) return;

    async function renderNotation() {
      if (!osmdContainerRef.current) return;
      const osmd = new OpenSheetMusicDisplay(osmdContainerRef.current, {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
      });
      osmdInstanceRef.current = osmd;
      await osmd.load(musicXmlBuffer!);
      osmd.render();
    }

    renderNotation();
  }, [musicXmlBuffer]);

  function resetState(picked: File | null) {
    setFile(picked);
    setStatus("idle");
    setJobId(null);
    setAudioUrl(null);
    setMusicXmlBuffer(null);
    setErrorMsg(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    resetState(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    resetState(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit() {
    if (!file) return;
    setStatus("loading");
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const processRes = await fetch(`${BACKEND}/process`, { method: "POST", body: formData });
      if (!processRes.ok) throw new Error("Processing failed on server");
      const { job_id } = await processRes.json();
      setJobId(job_id);

      const audioRes = await fetch(`${BACKEND}/result/${job_id}/audio`);
      if (!audioRes.ok) throw new Error("Could not fetch audio");
      setAudioUrl(URL.createObjectURL(await audioRes.blob()));

      const xmlRes = await fetch(`${BACKEND}/result/${job_id}/musicxml`);
      if (!xmlRes.ok) throw new Error("Could not fetch MusicXML");
      setMusicXmlBuffer(await xmlRes.blob());

      setStatus("done");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error occurred");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Mono:wght@300;400;500&display=swap');

        :root {
          --bg:      #0c0d10;
          --surface: #13151a;
          --border:  #2a2d38;
          --amber:   #f5c542;
          --teal:    #3dffd0;
          --rose:    #ff5f7e;
          --text:    #e8e9f0;
          --muted:   #6b6f80;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Mono', monospace;
          min-height: 100vh;
        }
        
        .page {
          width: min(94vw, 1700px);
          margin: 0 auto;
          padding: 48px 48px 80px;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        
        /* ── Header ── */
        .header { display: flex; flex-direction: column; gap: 6px; }
        
        .logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.2rem, 4vw, 3.2rem);
          font-weight: 700;
          letter-spacing: -1px;
          line-height: 1;
          background: linear-gradient(120deg, var(--amber) 0%, var(--teal) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .tagline {
          font-size: clamp(0.65rem, 1vw, 0.72rem);
          color: var(--muted);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        
        .divider {
          width: 48px;
          height: 2px;
          background: linear-gradient(90deg, var(--amber), var(--teal));
          margin-top: 10px;
          border-radius: 2px;
        }
        
        /* ── Upload Zone ── */
        .upload-zone {
          width: 100%;
          border: 1.5px dashed var(--border);
          border-radius: 16px;
          padding: clamp(32px, 4vw, 52px) 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          background: var(--surface);
        }
        
        .upload-zone.drag-over {
          border-color: var(--teal);
          background: rgba(61, 255, 208, 0.04);
        }
        
        .upload-zone:hover { border-color: var(--amber); }
        
        .upload-icon { width: 44px; height: 44px; color: var(--muted); }
        
        .upload-label {
          font-size: clamp(0.80rem, 1.2vw, 0.88rem);
          color: var(--text);
          text-align: center;
        }
        
        .upload-sub {
          font-size: 0.70rem;
          color: var(--muted);
          letter-spacing: 0.1em;
        }
        
        .file-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 197, 66, 0.1);
          border: 1px solid rgba(245, 197, 66, 0.3);
          color: var(--amber);
          font-size: 0.74rem;
          padding: 6px 14px;
          border-radius: 999px;
          max-width: 80%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .file-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--amber);
          flex-shrink: 0;
        }
        
        /* ── Button ── */
        .btn-process {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, var(--amber), #d4a800);
          color: #0c0d10;
          font-family: 'DM Mono', monospace;
          font-size: 0.80rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 14px 28px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
        }
        
        .btn-process:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .btn-process:disabled { opacity: 0.35; cursor: not-allowed; }
        
        .spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: #0c0d10;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        
        /* ── Status ── */
        .status-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.74rem;
          letter-spacing: 0.06em;
        }
        
        .status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .status-bar.loading { color: var(--amber); }
        .status-bar.loading .status-dot { background: var(--amber); animation: pulse 1s infinite; }
        .status-bar.done    { color: var(--teal); }
        .status-bar.done .status-dot    { background: var(--teal); }
        .status-bar.error   { color: var(--rose); }
        .status-bar.error .status-dot   { background: var(--rose); }
        
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        
        /* ── Results ── */
        .results {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
          animation: fadeUp 0.4s ease both;
        }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        
        /* ── Audio Card ── */
        .audio-card {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 22px 26px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .card-label {
          font-size: 0.66rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--muted);
        }
        
        audio {
          width: 100%;
          height: 40px;
          border-radius: 8px;
          accent-color: var(--teal);
        }
        
        /* ── Notation ── */
        .notation-card {
          width: 100%;
          background: #fff;
          border-radius: 14px;
          padding: 28px;
          overflow-x: auto;
        }
        
        /* OSMD fills the full container width */
        .notation-card > div {
          width: 100%;
          min-width: 0;
        }
        
        .notation-card svg {
          width: 100% !important;
          height: auto !important; 
          display: block;
        }
        
        input[type="file"] { display: none; }
      `}</style>

      <div className="page">

        <header className="header">
          <div className="logo">TrebleAI</div>
          <div className="tagline">Sheet music · OMR · Audio playback</div>
          <div className="divider" />
        </header>

        {/* Upload Zone */}
        <div
          className={`upload-zone ${dragOver ? "drag-over" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} />

          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/>
            <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
          </svg>

          {file ? (
            <div className="file-pill">
              <span className="file-dot" />
              {file.name}
            </div>
          ) : (
            <>
              <span className="upload-label">Drop sheet music here or click to browse</span>
              <span className="upload-sub">PNG · JPG · PDF</span>
            </>
          )}
        </div>

        {/* Process Button */}
        <button
          className="btn-process"
          onClick={handleSubmit}
          disabled={!file || status === "loading"}
        >
          {status === "loading" && <span className="spinner" />}
          {status === "loading" ? "Processing..." : "Process Sheet Music"}
        </button>

        {/* Status */}
        {status !== "idle" && (
          <div className={`status-bar ${status}`}>
            <span className="status-dot" />
            {status === "loading" && "Running OMR pipeline — this may take a minute..."}
            {status === "done"    && `Complete · Job ${jobId}`}
            {status === "error"   && errorMsg}
          </div>
        )}

        {/* Results */}
        {status === "done" && (
          <div className="results">
            {audioUrl && (
              <div className="audio-card">
                <span className="card-label">Audio Playback</span>
                <audio ref={audioRef} controls src={audioUrl} />
              </div>
            )}

            {musicXmlBuffer && (
              <div className="notation-card">
                <div ref={osmdContainerRef} />
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}