import { useEffect, useState } from "react";
import { apiUrl } from "./api";
import "./App.css";

const EXAMPLES = [
  "How many PTO days do employees get each year?",
  "Where should I report phishing?",
  "What counts as a Sev-1 incident?",
];

async function readError(res) {
  try {
    const data = await res.json();
    return data.detail || data.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

export default function App() {
  const [health, setHealth] = useState({ api: "…", db: "…" });
  const [folder, setFolder] = useState("acme-handbook");
  const [ingestMsg, setIngestMsg] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [question, setQuestion] = useState(EXAMPLES[0]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function refreshHealth() {
    try {
      const res = await fetch(apiUrl("/health"));
      if (!res.ok) throw new Error(await readError(res));
      setHealth(await res.json());
    } catch {
      setHealth({ api: "error", db: "error" });
    }
  }

  useEffect(() => {
    refreshHealth();
    const id = setInterval(refreshHealth, 50000);
    return () => clearInterval(id);
  }, []);

  async function onIngest(event) {
    event.preventDefault();
    setIngesting(true);
    setError("");
    setIngestMsg("");
    try {
      const res = await fetch(apiUrl("/v1/ingest"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: folder.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Ingest failed");
      setIngestMsg(`Indexed ${data.files} files, ${data.chunks} chunks.`);
    } catch (exc) {
      setError(exc.message);
    } finally {
      setIngesting(false);
      refreshHealth();
    }
  }

  async function onAsk(event) {
    event.preventDefault();
    setAsking(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(apiUrl("/v1/ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Ask failed");
      setResult(data);
    } catch (exc) {
      setError(exc.message);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="page">
      <header className="top">
        <div>
          <p className="eyebrow">Internal knowledge assistant</p>
          <h1>Acme Docs Copilot</h1>
        </div>
        <div className="pills">
          <Status label="API" ok={health.api === "ok"} />
          <Status label="DB" ok={health.db === "ok"} />
        </div>
      </header>

      <section className="panel">
        <h2>1. Ingest handbook</h2>
        <form className="row" onSubmit={onIngest}>
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            aria-label="Folder under sample_docs"
            placeholder="acme-handbook"
          />
          <button type="submit" disabled={ingesting}>
            {ingesting ? "Indexing…" : "Ingest"}
          </button>
        </form>
        {ingestMsg && <p className="ok">{ingestMsg}</p>}
      </section>

      <section className="panel">
        <h2>2. Ask the docs</h2>
        <form onSubmit={onAsk}>
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a handbook question"
          />
          <div className="chips">
            {EXAMPLES.map((q) => (
              <button
                key={q}
                type="button"
                className="chip"
                onClick={() => setQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
          <button type="submit" disabled={asking || !question.trim()}>
            {asking ? "Searching…" : "Ask"}
          </button>
        </form>
      </section>

      {error && <p className="err">{error}</p>}

      {result && (
        <section className="panel result">
          <h2>Answer</h2>
          <p className="answer">{result.answer}</p>

          <h3>Citations</h3>
          {result.citations?.length ? (
            <ul className="cites">
              {result.citations.map((c, i) => (
                <li key={`${c.path}-${i}`}>
                  <code>{c.path}</code>
                  <span>{Number(c.score).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No citations returned.</p>
          )}

          <h3>Agent trace</h3>
          <ol className="trace">
            {(result.agent_trace || []).map((name, i) => (
              <li key={`${name}-${i}`}>{name}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function Status({ label, ok }) {
  return (
    <span className={`pill ${ok ? "up" : "down"}`}>
      <i />
      {label} {ok ? "ok" : "down"}
    </span>
  );
}
