import { useEffect, useMemo, useState } from "react";
import {
  askQuestion,
  deleteDocument,
  embedSrc,
  fetchHealth,
  ingestFolder,
  listDocuments,
  safeLogo,
  uploadFiles,
} from "./api";
import "./App.css";

const ASK_EXAMPLES = [
  "How many PTO days do employees get each year?",
  "How many days a week can employees work from home?",
  "Where should I report phishing?",
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

export default function App() {
  const [health, setHealth] = useState({ api: "…", db: "…" });
  const [folder, setFolder] = useState("acme-handbook");
  const [queue, setQueue] = useState([]);
  const [drag, setDrag] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docLimit, setDocLimit] = useState(50);
  const [ingestMsg, setIngestMsg] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [question, setQuestion] = useState(ASK_EXAMPLES[0]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [brandName, setBrandName] = useState("Handbook");
  const [brandColor, setBrandColor] = useState("#2f5d50");
  const [brandLogo, setBrandLogo] = useState("/mark.svg");
  const [copied, setCopied] = useState(false);

  const brand = useMemo(
    () => ({
      name: brandName.trim() || "Docs Assistant",
      color: /^#([0-9a-f]{6})$/i.test(brandColor) ? brandColor : "#2f5d50",
      logo: safeLogo(brandLogo.trim()),
    }),
    [brandName, brandColor, brandLogo],
  );

  const snippet = `<script
  src="${window.location.origin}/widget.js"
  data-name="${brand.name.replace(/"/g, "")}"
  data-color="${brand.color}"${brand.logo ? `\n  data-logo="${brand.logo}"` : ""}
  defer
></script>`;

  async function refreshHealth() {
    try {
      setHealth(await fetchHealth());
    } catch {
      setHealth({ api: "error", db: "error" });
    }
  }

  async function refreshDocuments() {
    try {
      const data = await listDocuments();
      setDocuments(data.documents || []);
      setDocLimit(data.limit || 50);
    } catch {
      setDocuments([]);
    }
  }

  useEffect(() => {
    refreshHealth();
    refreshDocuments();
  }, []);

  function addFiles(fileList) {
    const next = [...fileList].filter((file) =>
      /\.(pdf|txt|md|markdown)$/i.test(file.name),
    );
    setQueue(next);
  }

  async function onUpload(event) {
    event.preventDefault();
    if (!queue.length) return;
    setIngesting(true);
    setError("");
    setIngestMsg("");
    try {
      const data = await uploadFiles(queue);
      setIngestMsg(`Indexed ${data.files} file${data.files === 1 ? "" : "s"}, ${data.chunks} chunks.`);
      setQueue([]);
      await refreshDocuments();
    } catch (exc) {
      setError(exc.message);
    } finally {
      setIngesting(false);
      refreshHealth();
    }
  }

  async function onIngestSample(event) {
    event.preventDefault();
    setIngesting(true);
    setError("");
    setIngestMsg("");
    try {
      const data = await ingestFolder(folder.trim());
      setIngestMsg(`Indexed ${data.files} sample files, ${data.chunks} chunks.`);
      await refreshDocuments();
    } catch (exc) {
      setError(exc.message);
    } finally {
      setIngesting(false);
      refreshHealth();
    }
  }

  async function onDelete(path) {
    setError("");
    try {
      await deleteDocument(path);
      await refreshDocuments();
    } catch (exc) {
      setError(exc.message);
    }
  }

  async function onAsk(event) {
    event.preventDefault();
    setAsking(true);
    setError("");
    setResult(null);
    try {
      const data = await askQuestion(question.trim());
      setResult({ ...data, summary: summarizeIntent });
    } catch (exc) {
      setError(exc.message);
    } finally {
      setAsking(false);
    }
  }

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const summarizeIntent = looksLikeSummary(question);
  const who = specialist(result?.agent_trace);
  const isSummary = Boolean(result?.summary) || who === "summarize_folder_agent";

  return (
    <div className="page">
      <header className="top">
        <div>
          <p className="eyebrow">Docs assistant with citations</p>
          <h1>Acme Docs Copilot</h1>
        </div>
        <div className="pills">
          <Status label="API" ok={health.api === "ok"} />
          <Status label="DB" ok={health.db === "ok"} />
        </div>
      </header>

      <section className="panel">
        <h2>1. Add documents</h2>
        <p className="hint">
          Upload PDF, TXT, or Markdown. The library holds {docLimit} documents.
          Citations keep the file name.
        </p>
        <form onSubmit={onUpload}>
          <label
            className={`drop${drag ? " drag" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDrag(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
              onChange={(event) => addFiles(event.target.files)}
            />
            <span>Drop files here, or browse</span>
          </label>
          {queue.length > 0 && (
            <ul className="queue">
              {queue.map((file) => (
                <li key={file.name}>{file.name}</li>
              ))}
            </ul>
          )}
          <div className="row actions">
            <button type="submit" disabled={ingesting || queue.length === 0}>
              {ingesting ? "Indexing…" : "Upload"}
            </button>
          </div>
        </form>
        <form className="row sample" onSubmit={onIngestSample}>
          <input
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            aria-label="Sample folder under sample_docs"
            placeholder="acme-handbook"
          />
          <button type="submit" className="secondary" disabled={ingesting}>
            Index sample handbook
          </button>
        </form>
        {ingestMsg && <p className="ok">{ingestMsg}</p>}

        <h3>Indexed</h3>
        {documents.length ? (
          <ul className="docs">
            {documents.map((doc) => (
              <li key={doc.path}>
                <code>{doc.path}</code>
                <span>
                  {doc.kind} · {doc.chunks} chunks
                </span>
                <button type="button" className="ghost" onClick={() => onDelete(doc.path)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nothing indexed yet.</p>
        )}
      </section>

      <section className="panel">
        <h2>2. Ask or summarize</h2>
        <p className="hint">
          Fact questions search the index. Summaries read the full document text.
          Both return file citations.
        </p>
        <form onSubmit={onAsk}>
          <textarea
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a question or request a summary"
          />
          <ChipRow label="Questions" items={ASK_EXAMPLES} onPick={setQuestion} />
          <ChipRow
            label="Summaries"
            items={SUMMARIZE_EXAMPLES}
            onPick={setQuestion}
            variant="summary"
          />
          <button type="submit" disabled={asking || !question.trim()}>
            {asking ? (summarizeIntent ? "Summarizing…" : "Searching…") : summarizeIntent ? "Summarize" : "Ask"}
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
              {result.citations.map((item, index) => (
                <li key={`${item.path}-${index}`}>
                  <code>{item.path}</code>
                  <span>{citationLabel(item.score)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No citations returned.</p>
          )}
          <h3>Agent trace</h3>
          <ol className="trace">
            {(result.agent_trace || []).map((name, index) => (
              <li key={`${name}-${index}`}>{name}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="panel">
        <h2>3. Embed the chat</h2>
        <p className="hint">
          The snippet adds a chat button to any page. The panel only asks questions.
          It does not show upload.
        </p>
        <div className="brand-row">
          <label>
            Name
            <input value={brandName} onChange={(event) => setBrandName(event.target.value)} />
          </label>
          <label>
            Color
            <input
              type="color"
              value={brand.color}
              onChange={(event) => setBrandColor(event.target.value)}
              aria-label="Brand color"
            />
          </label>
          <label>
            Logo URL
            <input
              value={brandLogo}
              onChange={(event) => setBrandLogo(event.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </label>
        </div>
        <div className="embed-layout">
          <div>
            <pre className="snippet">{snippet}</pre>
            <button type="button" className="secondary" onClick={copySnippet}>
              {copied ? "Copied" : "Copy snippet"}
            </button>
            <p className="hint live-hint">
              Open <a href="/widget-demo.html">the host-page demo</a> to see the button on a plain page.
            </p>
          </div>
          <iframe title="Widget preview" className="preview" src={embedSrc(brand)} />
        </div>
      </section>
    </div>
  );
}

function ChipRow({ label, items, onPick, variant }) {
  return (
    <div className="chip-group">
      <p className="chip-label">{label}</p>
      <div className="chips">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className={`chip${variant === "summary" ? " chip-summary" : ""}`}
            onClick={() => onPick(item)}
          >
            {item}
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
