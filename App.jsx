import { useState, useRef, useEffect } from "react";

// ── Telegram Mini App integration ──────────────────────────────────────────
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand(); // full-screen inside Telegram
  tg.setHeaderColor("#080c08");
  tg.setBackgroundColor("#080c08");
}

// ── Constants ─────────────────────────────────────────────────────────────
const OPERATORS = [
  { op: "site:", desc: "Limit to domain", example: "site:example.com" },
  { op: "filetype:", desc: "File type", example: "filetype:pdf" },
  { op: "inurl:", desc: "Word in URL", example: "inurl:admin" },
  { op: "intitle:", desc: "Word in title", example: "intitle:index" },
  { op: "intext:", desc: "Word in page", example: "intext:password" },
  { op: "cache:", desc: "Cached version", example: "cache:example.com" },
  { op: "related:", desc: "Related sites", example: "related:example.com" },
  { op: "link:", desc: "Links to URL", example: "link:example.com" },
  { op: '"..."', desc: "Exact phrase", example: '"exact phrase"' },
  { op: "-", desc: "Exclude term", example: "-exclude" },
  { op: "OR", desc: "Either term", example: "term1 OR term2" },
  { op: "ext:", desc: "Extension", example: "ext:log" },
];

const TEMPLATES = [
  { label: "📂 Open Directories", query: 'intitle:"index of" "parent directory"' },
  { label: "🔑 Exposed Config Files", query: 'filetype:env OR filetype:cfg "DB_PASSWORD"' },
  { label: "📋 Login Pages", query: "inurl:login OR inurl:signin intitle:login" },
  { label: "📊 Excel with Emails", query: "filetype:xls intext:@gmail.com" },
  { label: "📝 Exposed Logs", query: 'ext:log intext:"error" intext:"warning"' },
  { label: "🗄️ SQL Dumps", query: 'filetype:sql intext:"INSERT INTO"' },
  { label: "📷 Open Webcams", query: 'inurl:"/view/index.shtml" OR intitle:"webcamXP"' },
  { label: "🔒 WordPress Admin", query: "inurl:wp-admin inurl:login" },
  { label: "☁️ AWS S3 Buckets", query: "site:s3.amazonaws.com filetype:pdf" },
  { label: "📱 Exposed API Keys", query: 'filetype:json intext:"api_key"' },
  { label: "🛡️ Juicy Subdomains", query: 'site:*.target.com -www inurl:admin OR inurl:dev' },
  { label: "💾 Backup Files", query: 'filetype:bak OR filetype:backup OR ext:old inurl:backup' },
];

const GOOGLE_URL = "https://www.google.com/search?q=";

// ── AI query generator ────────────────────────────────────────────────────
async function generateDork(description) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are an expert at Google Dorking — constructing advanced search queries using operators like site:, filetype:, inurl:, intitle:, intext:, ext:, cache:, related:, link:, exact phrases in quotes, OR, and minus (-) exclusions.
When the user describes what they want to find, respond ONLY with a JSON object (no markdown, no backticks, no preamble):
{"query": "the google dork query here", "explanation": "1-2 sentence explanation of why this works"}`,
      messages: [{ role: "user", content: `Generate a Google dork query to find: ${description}` }],
    }),
  });
  const data = await res.json();
  const text = data.content?.find((b) => b.type === "text")?.text || "{}";
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { query: text, explanation: "" };
  }
}

// ── Styles helpers ────────────────────────────────────────────────────────
const btnStyle = (bg, color, padding = "10px 18px") => ({
  background: bg,
  color,
  border: `1px solid ${color}40`,
  padding,
  cursor: "pointer",
  fontFamily: "'Courier New', monospace",
  fontSize: 11,
  letterSpacing: 2,
  fontWeight: 700,
  transition: "all 0.12s",
});

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("ai");
  const [aiInput, setAiInput] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [cursorVisible, setCursorVisible] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    const iv = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(iv);
  }, []);

  const handleAIGenerate = async () => {
    if (!aiInput.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await generateDork(aiInput.trim());
      setResult(r);
      setHistory((h) => [{ query: r.query, label: aiInput.slice(0, 40) }, ...h.slice(0, 7)]);
    } catch {
      setResult({ query: "", explanation: "Error generating query. Please try again." });
    }
    setLoading(false);
  };

  const handleCopy = (q) => {
    navigator.clipboard.writeText(q);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSearch = (q) => {
    window.open(GOOGLE_URL + encodeURIComponent(q), "_blank");
  };

  const insertOperator = (op) => {
    const cleaned = op.replace("...", "");
    setManualQuery((q) => q + (q && !q.endsWith(" ") ? " " : "") + cleaned);
    inputRef.current?.focus();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080c08", fontFamily: "'Courier New', monospace", color: "#00ff41", padding: 0 }}>
      {/* Scanlines */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 0%, rgba(0,255,65,0.07) 0%, transparent 70%)" }} />

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 16px", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 8, color: "#00ff4170", marginBottom: 6 }}>ADVANCED SEARCH SYSTEM v2.6</div>
          <h1 style={{ fontSize: "clamp(26px, 6vw, 46px)", margin: 0, letterSpacing: 2, textShadow: "0 0 20px #00ff41, 0 0 60px #00ff4140", fontWeight: 700 }}>
            DORK<span style={{ color: "#fff" }}>BOT</span>
            <span>{cursorVisible ? "_" : "\u00a0"}</span>
          </h1>
          <div style={{ fontSize: 11, color: "#00ff4150", marginTop: 6, letterSpacing: 3 }}>AI-POWERED GOOGLE DORKING ENGINE</div>
          {tg?.initDataUnsafe?.user?.first_name && (
            <div style={{ fontSize: 11, color: "#00ff4160", marginTop: 4 }}>
              👤 {tg.initDataUnsafe.user.first_name}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid #00ff4125" }}>
          {[["ai", "⚡ AI"], ["manual", "🔧 MANUAL"], ["templates", "📋 TEMPLATES"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? "#00ff4115" : "transparent", border: "none", borderBottom: tab === id ? "2px solid #00ff41" : "2px solid transparent", color: tab === id ? "#00ff41" : "#00ff4145", padding: "9px 14px", cursor: "pointer", fontSize: 11, letterSpacing: 2, fontFamily: "inherit", transition: "all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── AI Tab ── */}
        {tab === "ai" && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 12, color: "#00ff4165", letterSpacing: 1 }}>&gt; DESCRIBE WHAT YOU WANT TO FIND:</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()} placeholder="e.g. exposed admin panels on .gov sites..." style={{ flex: 1, minWidth: 200, background: "#0d1a0d", border: "1px solid #00ff4135", color: "#00ff41", padding: "12px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", letterSpacing: 1 }} />
              <button onClick={handleAIGenerate} disabled={loading || !aiInput.trim()} style={{ ...btnStyle(loading ? "#00ff4118" : "#00ff41", loading ? "#00ff41" : "#000"), whiteSpace: "nowrap", opacity: !aiInput.trim() ? 0.4 : 1 }}>
                {loading ? "GENERATING..." : "GENERATE ⚡"}
              </button>
            </div>

            {loading && (
              <div style={{ padding: 20, color: "#00ff4160", fontSize: 12, letterSpacing: 2, textAlign: "center" }}>
                &gt; ANALYZING TARGET... CONSTRUCTING QUERY...
              </div>
            )}

            {result && !loading && (
              <div style={{ border: "1px solid #00ff4128", background: "#0d1a0d", padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#00ff4150", letterSpacing: 3, marginBottom: 10 }}>// GENERATED QUERY</div>
                <div style={{ fontSize: "clamp(11px,2vw,14px)", color: "#00ff41", padding: 12, background: "#000", border: "1px solid #00ff4118", wordBreak: "break-all", lineHeight: 1.8, textShadow: "0 0 8px #00ff4155", marginBottom: 12 }}>
                  {result.query || <span style={{ color: "#ff4444" }}>{result.explanation}</span>}
                </div>
                {result.explanation && result.query && (
                  <div style={{ fontSize: 11, color: "#00ff4165", lineHeight: 1.6, marginBottom: 14 }}>&gt; {result.explanation}</div>
                )}
                {result.query && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => handleSearch(result.query)} style={btnStyle("#00ff41", "#000")}>🔍 SEARCH GOOGLE</button>
                    <button onClick={() => handleCopy(result.query)} style={btnStyle("#00ff4325", "#00ff41")}>{copied ? "✓ COPIED!" : "⎘ COPY"}</button>
                    <button onClick={() => { setManualQuery(result.query); setTab("manual"); }} style={btnStyle("#00ff4315", "#00ff41")}>🔧 EDIT</button>
                  </div>
                )}
              </div>
            )}

            {history.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "#00ff4135", letterSpacing: 3, marginBottom: 8 }}>// RECENT</div>
                {history.map((h, i) => (
                  <div key={i} onClick={() => setResult({ query: h.query })} style={{ padding: "7px 10px", cursor: "pointer", borderLeft: "2px solid #00ff4118", marginBottom: 3, fontSize: 11, color: "#00ff4555", transition: "all 0.1s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#00ff41"; e.currentTarget.style.borderLeftColor = "#00ff41"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#00ff4555"; e.currentTarget.style.borderLeftColor = "#00ff4118"; }}>
                    <span style={{ color: "#00ff4135" }}>[{i + 1}]</span> {h.label}...
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Manual Tab ── */}
        {tab === "manual" && (
          <div>
            <div style={{ fontSize: 12, color: "#00ff4165", letterSpacing: 1, marginBottom: 14 }}>&gt; CLICK OPERATORS TO INSERT:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 18 }}>
              {OPERATORS.map(({ op, desc }) => (
                <button key={op} onClick={() => insertOperator(op)} title={desc} style={{ background: "#0d1a0d", border: "1px solid #00ff4128", color: "#00ff41", padding: "5px 11px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, letterSpacing: 1, transition: "all 0.12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#00ff4115"; e.currentTarget.style.borderColor = "#00ff41"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#0d1a0d"; e.currentTarget.style.borderColor = "#00ff4128"; }}>
                  {op}
                </button>
              ))}
            </div>
            <textarea ref={inputRef} value={manualQuery} onChange={(e) => setManualQuery(e.target.value)} rows={4} placeholder='site:example.com filetype:pdf intext:"confidential"' style={{ width: "100%", background: "#0d1a0d", border: "1px solid #00ff4135", color: "#00ff41", padding: "12px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.7, boxSizing: "border-box" }} />

            <div style={{ marginTop: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: "#00ff4135", letterSpacing: 3, marginBottom: 8 }}>// OPERATOR REFERENCE</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 5 }}>
                {OPERATORS.map(({ op, desc, example }) => (
                  <div key={op} style={{ fontSize: 10, color: "#00ff4555", padding: "5px 8px", borderLeft: "1px solid #00ff4118", lineHeight: 1.5 }}>
                    <span style={{ color: "#00ff41" }}>{op}</span> — {desc}<br />
                    <span style={{ color: "#00ff4135" }}>{example}</span>
                  </div>
                ))}
              </div>
            </div>

            {manualQuery && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => handleSearch(manualQuery)} style={btnStyle("#00ff41", "#000")}>🔍 SEARCH GOOGLE</button>
                <button onClick={() => handleCopy(manualQuery)} style={btnStyle("#00ff4325", "#00ff41")}>{copied ? "✓ COPIED!" : "⎘ COPY"}</button>
                <button onClick={() => setManualQuery("")} style={btnStyle("#ff444418", "#ff4444")}>✕ CLEAR</button>
              </div>
            )}
          </div>
        )}

        {/* ── Templates Tab ── */}
        {tab === "templates" && (
          <div>
            <div style={{ fontSize: 12, color: "#00ff4165", letterSpacing: 1, marginBottom: 14 }}>&gt; SELECT A PRE-BUILT DORK:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {TEMPLATES.map(({ label, query }) => (
                <div key={label} style={{ border: "1px solid #00ff4118", background: "#0d1a0d", padding: "12px 16px", transition: "all 0.14s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00ff4155"; e.currentTarget.style.background = "#0f1f0f"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#00ff4118"; e.currentTarget.style.background = "#0d1a0d"; }}>
                  <div style={{ fontSize: 12, color: "#00ff41", marginBottom: 5, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 10, color: "#00ff4160", marginBottom: 10, wordBreak: "break-all" }}>{query}</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => handleSearch(query)} style={btnStyle("#00ff41", "#000", "7px 14px")}>🔍 SEARCH</button>
                    <button onClick={() => handleCopy(query)} style={btnStyle("#00ff4320", "#00ff41", "7px 14px")}>{copied ? "✓" : "⎘ COPY"}</button>
                    <button onClick={() => { setManualQuery(query); setTab("manual"); }} style={btnStyle("#00ff4315", "#00ff41", "7px 14px")}>🔧 EDIT</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 36, borderTop: "1px solid #00ff4110", paddingTop: 14, fontSize: 10, color: "#00ff4125", letterSpacing: 2, textAlign: "center" }}>
          FOR ETHICAL SECURITY RESEARCH ONLY · RESPECT TOS
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::placeholder { color: #00ff4128; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #080c08; }
        ::-webkit-scrollbar-thumb { background: #00ff4128; }
      `}</style>
    </div>
  );
}
