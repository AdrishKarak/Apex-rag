# ⚡ Apex — AI-Powered GitHub Repository Intelligence & RAG Platform

<p align="center">
  <img src="public/logo.svg" alt="Apex Logo" width="96" height="96" />
</p>

<p align="center">
  <b>Apex</b> is an ultra-modern, production-grade GitHub Repository Intelligence platform that transforms static codebases into queryable, interactive memory layers. Grounded by Retrieval-Augmented Generation (RAG), commit tracking, meeting transcription, and vector search.
</p>

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-architecture-at-a-glance">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-credit-economics">Credit System</a> •
  <a href="#-security--performance">Security</a>
</p>

---

## 🚀 Key Features

- **🔍 Codebase RAG & Vector Search**: Connect any public or private GitHub repository. Apex chunks source code, generates 768-dimensional vector embeddings, and enables high-precision semantic search over the entire project.
- **🤖 Grounded Q&A with File References**: Ask implementation questions in natural language and receive comprehensive answers with clickable source code file references—preventing AI hallucinations.
- **📜 Commit Intelligence & Summaries**: Automatically poll and digest Git commit logs via Octokit. Generates concise AI summaries of developer changes in real time.
- **🎙️ Meeting Intelligence (Audio-to-Code)**: Upload meeting recordings (`MP3`, `WAV`, `M4A`). Powered by AssemblyAI, Apex transcribes calls, extracts key discussion topics, and generates actionable project issues.
- **🔍 Top-Bar Command Palette (`⌘K` / `Ctrl+K`)**: Search and seamlessly switch across your indexed projects instantly with keyboard shortcuts and fuzzy matching.
- **👥 Collaborative Workspaces**: Invite team members via unique invite codes, manage project membership roles (`CREATOR` / `MEMBER`), and share project history.
- **💳 Credit Accounting System**: Transparent token consumption model (150 signup credits, dynamic deduction per indexing, sync, Q&A, and audio processing).
- **🛡️ Enterprise Security & Rate Limiting**: Features sliding-window rate limiting, server-side TTL caching, strict Zod input sanitization, and full HTTP security headers (`CSP`, `HSTS`, `X-Frame-Options`).

---

## 📐 Architecture at a Glance

```mermaid
graph TD
    Client[Next.js 16 Web Client] -->|tRPC / React Query| API[tRPC API Router]
    API -->|Auth Verification| Clerk[Clerk Authentication]
    API -->|Rate Limit Check| RateLimiter[Sliding-Window Rate Limiter]
    API -->|Read-through Cache| Cache[Server-side TTL Cache]
    API -->|ORM Operations| Prisma[Prisma ORM]

    Prisma -->|Vector Similarity Search| Postgres[(PostgreSQL + pgvector)]

    API -->|Embeddings & RAG| Gemini[Google Gemini AI]
    API -->|LLM Reasoning| Groq[Groq LLaMA-3.3-70B]
    API -->|Commit Ingestion| GitHub[GitHub API / Octokit]
    API -->|Speech-to-Text| Assembly[AssemblyAI API]
```

> 📘 **Looking for deep-dive technical documentation?** Read our comprehensive [Architecture.md](file:///home/adrish/Desktop/Github-RAG/github-rag/Architecture.md) document.

---

## 🛠️ Tech Stack

### Frontend & Core
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling & UI**: Tailwind CSS v4, Lucide Icons, Framer Motion, GSAP, Lenis Smooth Scroll
- **UI Components**: Base UI, Radix Primitives, `cmdk` Command Palette

### Backend & Database
- **API Layer**: [tRPC v11](https://trpc.io/) with TanStack Query v5
- **ORM**: [Prisma ORM](https://www.prisma.io/) with PostgreSQL Extensions
- **Vector Database**: PostgreSQL with [`pgvector`](https://github.com/pgvector/pgvector) extension (768-dim embeddings)
- **Authentication**: [Clerk Auth](https://clerk.com/)

### AI & Integrations
- **Vector Embeddings**: `@google/genai` (`text-embedding-004`)
- **LLM Reasoning**: Groq API (`llama-3.3-70b-versatile`) & Google Gemini 1.5 Flash
- **Audio Processing**: [AssemblyAI](https://www.assemblyai.com/) Speech-to-Text & Topic Detection
- **Git Integration**: Octokit GitHub API & LangChain Document Loaders

---

## 🏁 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **Package Manager**: [`bun`](https://bun.sh/) (recommended) or `npm` / `pnpm`
- **Database**: PostgreSQL database with `vector` (`pgvector`) extension enabled

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/github-rag.git
   cd github-rag
   ```

2. **Install Dependencies**:
   ```bash
   bun install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your API credentials:
   ```bash
   cp .env.example .env
   ```

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/github_rag?sslmode=disable"

   # Clerk Auth
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."

   # AI Providers
   GEMINI_API_KEY="AIzaSy..."
   GROQ_API_KEY="gsk_..."
   ASSEMBLY_AI_KEY="..."

   # Optional GitHub Token
   GITHUB_TOKEN="ghp_..."
   ```

4. **Initialize Database Schema**:
   ```bash
   bun run db:push
   ```

5. **Start Development Server**:
   ```bash
   bun dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### 🐳 Running with Docker (Recommended for Production)

Run the full application stack (Next.js web app + PostgreSQL database with `pgvector`) with a single Docker command:

1. **Configure Environment Variables**:
   Ensure `.env` contains your required keys:
   ```bash
   cp .env.example .env
   ```

2. **Start Containers**:
   ```bash
   docker compose up --build -d
   ```

3. **Access Application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Stop Containers**:
   ```bash
   docker compose down
   ```

---

## 💳 Credit Economics

Apex features a built-in credit metering engine to regulate resource usage:

| Operation | Credit Cost | Description |
| :--- | :--- | :--- |
| **New Project Creation & Indexing** | `150 credits` | Clones repository, parses code, generates vector embeddings |
| **Meeting Processing** | `100 credits` | Transcribes audio via AssemblyAI and generates issue summary |
| **Repository Sync** | `15 credits` | Polls new commits and updates code vector indices |
| **AI Question Answering** | `10 credits` | Vector similarity search and RAG answer generation |

> 🎁 Every new user receives **150 free credits** upon signing up. Additional credits can be added via the Billing interface.

---

## 🛡️ Security & Performance

- **Rate Limiting**: Sliding-window in-memory rate limiting applied to all tRPC procedures (15 req/min on mutations, 120 req/min on queries).
- **Server Caching**: Multi-level TTL cache for project listings, membership data, and invite links with automatic cache invalidation upon state mutation.
- **Security Headers**: Production HTTP security headers including `HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`.
- **Sanitization**: Strict Zod validation schemas across all backend entry points to prevent XSS and payload injection attacks.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
