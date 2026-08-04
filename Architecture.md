# 🏗️ Apex Architecture & Technical System Design

This document details the architectural blueprint, data flows, security posture, and subsystem designs behind **Apex** — a modern GitHub Repository Intelligence and Retrieval-Augmented Generation (RAG) platform.

---

## 📌 Executive Architecture Summary

Apex is designed around three core pillars:
1. **Low-Latency Repository Context Ingestion**: Code parsing, AST chunking, vector embedding generation, and fast similarity retrieval using PostgreSQL `pgvector`.
2. **Multi-Modal Project Intelligence**: Unifying source code vectors, Git commit histories, and meeting audio transcriptions into a coherent workspace.
3. **Defense-in-Depth & Scalability**: Zero-trust authentication via Clerk, sliding-window rate-limiting, TTL server-side caching, and granular credit metering.

---

## 🏛️ System Architecture Backbone

```mermaid
graph TB
    subgraph Client Layer
        WebClient[Next.js 16 Web Client / React 19]
        CmdPalette[Top-Bar Command Palette - Cmd+K]
        ClientCache[TanStack Query Cache]
    end

    subgraph Edge & Proxy Middleware
        Proxy[Next.js Proxy / Middleware]
        SecHeaders[HTTP Security Headers Injector]
    end

    subgraph API Router & Guard Layer
        TRPCRouter[tRPC v11 Router]
        AuthGuard[Clerk Auth Guard]
        RateLimiter[Sliding-Window Rate Limiter]
        ServerCache[TTL In-Memory Response Cache]
    end

    subgraph Data & Persistence Layer
        Prisma[Prisma ORM Client]
        PG[(PostgreSQL Database)]
        PGVector[(pgvector Extension - 768 dim)]
    end

    subgraph External AI & Cloud Services
        Gemini[Google Gemini API - text-embedding-004]
        Groq[Groq LLaMA-3.3-70B API]
        Assembly[AssemblyAI Speech Engine]
        Octokit[GitHub REST & GraphQL API]
    end

    WebClient -->|HTTP / JSON RPC| Proxy
    Proxy --> SecHeaders
    Proxy --> TRPCRouter

    TRPCRouter --> AuthGuard
    TRPCRouter --> RateLimiter
    TRPCRouter --> ServerCache
    TRPCRouter --> Prisma

    Prisma --> PG
    Prisma --> PGVector

    TRPCRouter -->|Generate Embeddings| Gemini
    TRPCRouter -->|LLM Synthesis & Q&A| Groq
    TRPCRouter -->|Fetch Commits & Repos| Octokit
    TRPCRouter -->|Transcribe & Summarize Calls| Assembly
```

---

## 🔄 Core Subsystem Flows

### 1. Repository Indexing & Vectorization Pipeline

When a user links a GitHub repository, Apex triggers an asynchronous background ingestion pipeline.

```mermaid
flowchart TD
    A[User Submits GitHub Repo URL] --> B[Deduct 150 Credits & Create Project Record]
    B --> C[Set project.isIndexing = true]
    C --> D[Poll Recent Commits via Octokit]
    D --> E[Clone/Fetch Source Files via LangChain Loaders]
    E --> F[Code Chunking & AST Token Splitting]
    F --> G[Generate 768-dim Vector Embeddings via Gemini]
    G --> H[Store Source Code & Vectors in pgvector]
    H --> I[Set project.isIndexing = false]
    I --> J[Trigger Client Toast Notification via Hook Polling]
```

### 2. RAG & Semantic Vector Search Flow

When a user asks a question about their codebase, Apex performs cosine similarity vector search over `pgvector` chunks before passing the context to the LLM.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Next.js Web App
    participant TRPC as tRPC Router
    participant Cache as MemoryCache
    participant Rate as RateLimiter
    participant Gemini as Google Gemini
    participant DB as Postgres (pgvector)
    participant Groq as Groq LLaMA-3.3-70B

    User->>Client: Type question & submit
    Client->>TRPC: project.askQuestion({ projectId, question })
    TRPC->>Rate: Check user rate limit (15 req/min)
    Rate-->>TRPC: Allowed

    TRPC->>Gemini: Vectorize question string (text-embedding-004)
    Gemini-->>TRPC: Return 768-dim float array vector

    TRPC->>DB: Query nearest sourceCodeEmbeddings (Cosine distance <= 0.5)
    DB-->>TRPC: Return Top-5 matching code chunks with file names

    TRPC->>Groq: Prompt(question + top 5 code chunks + source file paths)
    Groq-->>TRPC: Stream/Return grounded answer with file references

    TRPC->>DB: Save Question & Answer in project history
    TRPC-->>Client: Return Answer + Referenced Files
    Client-->>User: Render markdown response + clickable file badges
```

### 3. Audio & Meeting Intelligence Flow

Apex converts team meeting recordings into project issues and transcripts.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Next.js Web App
    participant TRPC as tRPC Router
    participant Assembly as AssemblyAI API
    participant DB as Postgres DB

    User->>Client: Upload MP3/WAV file URL
    Client->>TRPC: project.uploadMeeting({ projectId, meetingUrl, name })
    TRPC->>DB: Deduct 100 credits & Create Meeting (status: PROCESSING)
    TRPC-->>Client: Return Meeting ID

    par Async Background Worker
        TRPC->>Assembly: Submit audio file URL for transcription
        Assembly-->>TRPC: Return Transcript & Topic Detection
        TRPC->>DB: Store Issues (start, end, headline, summary) & update status to COMPLETED
    end
```

---

## 🔒 Security Architecture & Defensive Posture

Apex incorporates multiple layers of security defenses to safeguard data and prevent API abuse:

```
+-----------------------------------------------------------------------+
|                         Next.js Edge Middleware                       |
|  - Strict Security Headers (HSTS, CSP, X-Frame-Options, Nosniff)     |
|  - Public vs Protected Route Isolation                               |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                        Clerk Authentication Guard                     |
|  - JWT Session Verification & Fast-Path Local User Verification      |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                    Sliding-Window Rate Limiter                        |
|  - 15 req/min on mutations (indexing, Q&A, meetings)                 |
|  - 120 req/min on queries                                             |
|  - Keyed by user ID (authenticated) or IP address (unauthenticated)   |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                      Zod Input Sanitization                           |
|  - Strict payload size limits (.max()), trim(), URL validation        |
+-----------------------------------------------------------------------+
```

---

## ⚡ Performance & Caching Architecture

To achieve low latency and minimize database pressure, Apex uses a **Two-Tier Caching Architecture**:

1. **Client-Side Tier (TanStack Query)**:
   - Automatic background refetching and window focus synchronization.
   - Dynamic refetch interval (polling every 3s) when active project `isIndexing === true`, automatically halting once indexing finishes.

2. **Server-Side Tier (`MemoryCache`)**:
   - High-performance in-memory cache with configurable TTL (Time-To-Live).
   - `getProjects`: Cached for 30s per user.
   - `getTeamMembers`: Cached for 60s per project.
   - `getProjectByInviteCode`: Cached for 5m.
   - **Pattern-Based Invalidation**: Any state-changing mutation (`createProject`, `deleteProject`, `joinProject`, `leaveProject`, `syncProject`) immediately invalidates affected cache keys.

---

## 🗄️ Database Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ UserToProject : "belongs to"
    User ||--o{ Question : "asks"
    User ||--o{ CreditTransaction : "executes"

    Project ||--o{ UserToProject : "has members"
    Project ||--o{ Commit : "contains"
    Project ||--o{ SourceCodeEmbeddings : "indexes"
    Project ||--o{ Question : "stores Q&A"
    Project ||--o{ Meeting : "holds meetings"

    Meeting ||--o{ Issue : "generates"

    User {
        string id PK
        string emailAddress UK
        string firstName
        string lastName
        string imageUrl
        int credits
        datetime createdAt
    }

    Project {
        string id PK
        string name
        string githubUrl
        string githubToken
        boolean isIndexing
        string inviteCode UK
        datetime deletedAt
    }

    UserToProject {
        string id PK
        string userId FK
        string projectId FK
        string role
    }

    SourceCodeEmbeddings {
        string id PK
        string projectId FK
        vector summaryEmbedding
        string sourceCode
        string fileName
        string summary
    }

    Commit {
        string id PK
        string projectId FK
        string commitMessage
        string commitHash
        string commitAuthorName
        string commitAuthorAvatar
        string commitDate
        string summary
    }

    Meeting {
        string id PK
        string projectId FK
        string meetingUrl
        string name
        enum status
    }

    Issue {
        string id PK
        string meetingId FK
        string start
        string end
        string headline
        string summary
    }

    Question {
        string id PK
        string projectId FK
        string userId FK
        string question
        string answer
        json filesReferences
    }

    CreditTransaction {
        string id PK
        string userId FK
        int amount
        datetime createdAt
    }
```

---

## 📊 Summary of Architectural Highlights

| Subsystem | Technology | Purpose / Benefit |
| :--- | :--- | :--- |
| **Vector DB** | PostgreSQL + `pgvector` | Native relational + vector storage (768-dim embeddings) |
| **API Layer** | tRPC v11 + Zod | End-to-end type safety with client-side inference |
| **Rate Limiter** | In-Memory Sliding Window | Prevents API spam, DDOS, and LLM credit exhaustion |
| **Cache Engine** | In-Memory MemoryCache | Sub-5ms response times for frequent project read queries |
| **Auth Engine** | Clerk Auth | Secure multi-tenant authentication with seamless session tokens |
