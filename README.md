# Acme Docs Copilot UI

Simple React UI for the [Acme Docs Copilot API](../co-pilot). Ingest the handbook, ask a question, see the cited answer.

Sibling of the backend repo:

```text
ACME/
├── co-pilot/       FastAPI + ADK + pgvector
└── co-pilot-ui/    this React app
```

## Setup

API pehle `http://127.0.0.1:8001` pe chalti honi chahiye (`co-pilot` repo).

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

`.env`:

```env
VITE_API_URL=http://127.0.0.1:8001
```

## Flow

1. **Ingest** `acme-handbook`
2. **Ask** e.g. “How many PTO days do employees get each year?”
3. Read the answer, file citations, and agent trace
