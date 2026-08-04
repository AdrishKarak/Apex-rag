# 🗺️ Apex System Flow & File Connections Diagram

This document maps out the internal structural relationships and sequential runtime pipelines of **Apex** using Mermaid flowcharts and graph models.

---

## 🏛️ 1. File Dependency & Connection Graph

The following graph maps how files in the codebase import, trigger, or depend on one another.

```mermaid
graph TD
    %% Client Pages & Hooks
    ClientLayout["src/app/(protected)/layout.tsx"]
    AppSidebar["src/app/(protected)/app-sidebar.tsx"]
    CreatePage["src/app/(protected)/create/page.tsx"]
    MeetingsPage["src/app/(protected)/meetings/page.tsx"]
    QAPage["src/app/(protected)/qa/page.tsx"]
    BillingPage["src/app/(protected)/billing/page.tsx"]
    
    useProjectHook["src/hooks/use-project.ts"]
    useRefetchHook["src/hooks/use-refetch.ts"]
    
    %% tRPC & Route Gateways
    Proxy["src/proxy.ts"]
    TRPCHandler["src/app/api/trpc/[trpc]/route.ts"]
    TRPCReact["src/trpc/react.tsx"]
    TRPCServer["src/trpc/server.ts"]
    
    %% tRPC Router Implementations
    TRPCCore["src/server/api/trpc.ts"]
    TRPCRoot["src/server/api/root.ts"]
    RouterProject["src/server/api/routers/project.ts"]
    RouterUser["src/server/api/routers/user.ts"]
    
    %% RAG Server Action
    AskQuestionAction["src/app/(protected)/dashboard/action.ts"]
    
    %% Background Libs
    Cache["src/lib/cache.ts"]
    RateLimit["src/lib/rate-limit.ts"]
    DBConnection["src/server/db.ts"]
    GithubLoaders["src/lib/github-loaders.ts"]
    GithubCommitPoll["src/lib/github.ts"]
    AssemblyAI["src/lib/assembly.ts"]
    FirebaseUpload["src/lib/firebase.ts"]
    GeminiAI["src/lib/gemini.ts"]
    GroqAI["src/lib/groq.ts"]

    %% Dependency Connections
    Proxy -->|clerkAuth.protect| ClientLayout
    TRPCHandler -->|routes calls| TRPCRoot
    TRPCRoot -->|namespaces routers| RouterProject
    TRPCRoot -->|namespaces routers| RouterUser
    
    %% Client Component hooks queries
    TRPCReact -->|consumes type| TRPCRoot
    ClientLayout -->|imports| AppSidebar
    AppSidebar -->|uses| useProjectHook
    CreatePage -->|calls createProject| TRPCReact
    MeetingsPage -->|calls getMeetings| TRPCReact
    QAPage -->|calls getQuestions| TRPCReact
    BillingPage -->|calls getMyCredits / buyCredits| TRPCReact
    
    %% Hooks mapping
    useProjectHook -->|calls getProjects query| TRPCReact
    useRefetchHook -->|queries active refetch| TRPCReact
    
    %% Router internals
    RouterProject -->|uses| DBConnection
    RouterProject -->|calls| GithubLoaders
    RouterProject -->|calls| GithubCommitPoll
    RouterProject -->|calls| AssemblyAI
    RouterProject -->|calls| Cache
    
    RouterUser -->|uses| DBConnection
    
    %% Security & cache middleware
    TRPCCore -->|imports| RateLimit
    TRPCCore -->|imports| DBConnection
    
    %% Ingest Pipelines
    GithubLoaders -->|uses| DBConnection
    GithubLoaders -->|generates embeddings| GeminiAI
    GithubLoaders -->|summarizes code| GroqAI
    
    GithubCommitPoll -->|uses| DBConnection
    GithubCommitPoll -->|diff summaries| GroqAI
    
    AssemblyAI -->|uses| DBConnection
    AssemblyAI -->|audio summaries| GeminiAI
    
    %% RAG System Flows
    AskQuestionAction -->|credits checks| DBConnection
    AskQuestionAction -->|question embedding| GeminiAI
    AskQuestionAction -->|stream completions| GroqAI
```

---

## 🔄 2. Core Operational Sequence Pipelines

### A. Repository Creation & Indexing Flow

When a user links a new repository inside `create/page.tsx`, this pipeline coordinates database setups, token validation, commit scraping, and parallel AI parsing.

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer Client
    participant TRPC as projectRouter (createProject)
    participant DB as Postgres Database
    participant Octokit as Github.ts (Commit Poller)
    participant Loader as Github-Loaders.ts (Indexer)
    participant Groq as Groq AI Client
    participant Gemini as Gemini AI Client

    User->>TRPC: createProject({ name, githubUrl, githubToken })
    TRPC->>DB: Check creator credits & deduct 150 tokens
    TRPC->>DB: Create Project record (isIndexing = true)
    TRPC->>Octokit: Start pollCommits(projectId)
    Octokit->>Groq: Request git commit diff summaries
    Groq-->>Octokit: Return bulleted commit summaries
    Octokit->>DB: Batch insert top 10 commits
    
    Note over TRPC,Loader: Asynchronous Indexing Handed to Background (Returns 200 OK to User instantly)
    TRPC-->>User: Return Project record metadata
    
    par Async Ingestion Worker
        Loader->>Loader: loadGithubRepo() (Fetch files recursively)
        Loader->>DB: Query existing files for Incremental Sync
        Loader->>Loader: Exclude assets, binary, style files
        
        loop Parallel Ingestion Queue (2 Groq Workers + 1 Gemini Worker)
            Loader->>Groq: Summarize source file (llama-3.1-8b-instant)
            alt Groq Rate Limit Fallback
                Loader->>Gemini: Summarize source file (gemini-2.0-flash)
            end
            Loader->>Gemini: generateEmbedding(summary) (gemini-embedding-2)
        end
        
        Loader->>DB: executeRaw insert of 768-dim vector embeddings
        Loader->>DB: Set project isIndexing = false
        Loader->>User: Client Toast fires on state change (isIndexing: true -> false)
    end
```

---

## 💬 3. Semantic RAG Q&A Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer Client
    participant Action as Action.ts (askQuestion)
    participant DB as Postgres Database
    participant Gemini as Gemini AI (Embeddings)
    participant Groq as Groq AI (Completions)

    User->>Action: askQuestion(question, projectId)
    Action->>DB: Check and deduct 10 credits from User
    Action->>Gemini: generateEmbedding(question)
    Gemini-->>Action: Return 768-dim query vector
    
    Action->>DB: Execute similarity search (1 - summaryEmbedding <=> queryVector)
    DB-->>Action: Return top-scoring matches with filenames & source code
    
    Action->>Action: Apply relative threshold filter (topSimilarity - 0.12)
    Action->>Groq: Prompt text completion (Stream context + LLaMA 3.3 model)
    
    loop Stream Response Tokens
        Groq-->>User: Stream text tokens in real time
    end
```
