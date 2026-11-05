import { useEffect, useState } from "react";
import { askQuestion, readBrand } from "./api";
import "./App.css";

export default function Embed() {
  const brand = readBrand();
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    document.title = brand.name;
  }, [brand.name]);

  async function onAsk(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || pending) return;
    setQuestion("");
    setMessages((items) => [...items, { role: "user", text }]);
    setPending(true);
    try {
      const data = await askQuestion(text);
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: data.answer || "No answer returned.",
          citations: data.citations || [],
        },
      ]);
    } catch (exc) {
      setMessages((items) => [
        ...items,
        { role: "assistant", text: exc.message || "The assistant is unavailable." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="embed">
      <header className="embed-top" style={{ background: brand.color }}>
        {brand.logo && <img src={brand.logo} alt="" />}
        <strong>{brand.name}</strong>
      </header>
      <div className="embed-log">
        {messages.length === 0 && (
          <p className="muted">Ask a question about the indexed documents.</p>
        )}
        {messages.map((message, index) => (
          <article key={index} className={`bubble ${message.role}`}>
            <p>{message.text}</p>
            {message.citations?.length > 0 && (
              <p className="bubble-cites">
                {message.citations.map((item) => item.path).join(" · ")}
              </p>
            )}
          </article>
        ))}
        {pending && <p className="muted">Searching…</p>}
      </div>
      <form className="embed-form" onSubmit={onAsk}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about the docs"
          aria-label="Question"
        />
        <button type="submit" style={{ background: brand.color }} disabled={pending || !question.trim()}>
          Ask
        </button>
      </form>
    </div>
  );
}
