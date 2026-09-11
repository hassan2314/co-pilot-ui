import { useEffect, useState } from "react";
import { apiUrl } from "./api";
import "./App.css";

const ASK_EXAMPLES = [
  "How many PTO days do employees get each year?",
  "Where should I report phishing?",
  "What counts as a Sev-1 incident?",
];

const SUMMARIZE_EXAMPLES = [
  "Summarize the PTO policy",
  "Summarize the security policy",
  "Give me an overview of onboarding",
];

function looksLikeSummary(question) {
  return /\b(summarize|overview|tl;?dr|recap)\b/i.test(question);
}

function specialist(trace) {
  if (!trace?.length) return null;
  return [...trace].reverse().find((name) => name !== "coordinator") || trace.at(-1);
}

function citationLabel(score) {
  if (Number(score) >= 0.999) return "full file";
  return Number(score).toFixed(2);
}

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
  const [question, setQuestion] = useState(ASK_EXAMPLES[0]);
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

  const summarizeIntent = looksLikeSummary(question);
  const who = specialist(result?.agent_trace);
  const isSummary = who === "summarize_folder_agent";

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
        <p className="hint">
          Indexes markdown into Postgres. This step is a pipeline — no agent.
        </p>
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
        <h2>2. Ask or summarize</h2>
        <p className="hint">
          The coordinator sends fact questions to <code>qa_agent</code> and
          recaps to <code>summarize_folder_agent</code>.
        </p>
        <form onSubmit={onAsk}>
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a handbook question or request a policy summary"
          />
          <ChipRow
            label="Questions"
            items={ASK_EXAMPLES}
            onPick={setQuestion}
          />
          <ChipRow
            label="Summaries"
            items={SUMMARIZE_EXAMPLES}
            onPick={setQuestion}
            variant="summary"
          />
          <button type="submit" disabled={asking || !question.trim()}>
            {asking
              ? summarizeIntent
                ? "Summarizing…"
                : "Searching…"
              : summarizeIntent
                ? "Summarize"
                : "Ask"}
          </button>
        </form>
      </section>

      {error && <p className="err">{error}</p>}

      {result && (
        <section className="panel result">
          <div className="result-head">
            <h2>{isSummary ? "Summary" : "Answer"}</h2>
            {who && <span className="badge">{who}</span>}
          </div>
          <p className="answer">{result.answer}</p>

          <h3>{isSummary ? "Sources" : "Citations"}</h3>
          {result.citations?.length ? (
            <ul className="cites">
              {result.citations.map((c, i) => (
                <li key={`${c.path}-${i}`}>
                  <code>{c.path}</code>
                  <span>{citationLabel(c.score)}</span>
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

function ChipRow({ label, items, onPick, variant }) {
  return (
    <div className="chip-group">
      <p className="chip-label">{label}</p>
      <div className="chips">
        {items.map((q) => (
          <button
            key={q}
            type="button"
            className={`chip${variant === "summary" ? " chip-summary" : ""}`}
            onClick={() => onPick(q)}
          >
            {q}
          </button>
        ))}
      </div>
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
