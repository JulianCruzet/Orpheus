# Orpheus Showcase Diagrams

these are presentation-ready mermaid diagrams you can paste into Notion, GitHub, or Mermaid Live.

## 1) System Architecture

```mermaid
flowchart LR
  U[Store Owner]
  UI[Next.js Chat UI\n/app/chat]
  API[/api/chat]
  AGENT[Gemini Agent Loop\nintent + tool orchestration]
  REG[Tool Registry]

  SHOP[Shopify Admin API]
  RS[Research Sources\n(Firecrawl/Web)]
  IMG[Image Generation]

  DB[(SQLite + Drizzle\nconversations/messages/action_log)]
  SAFE[Safety Layer\nconfirmations/redaction/undo]

  U --> UI --> API --> AGENT --> REG
  REG --> SHOP
  REG --> RS
  REG --> IMG

  API --> DB
  API --> SAFE
  SAFE --> REG
```

## 2) Core Agent Execution Loop

```mermaid
sequenceDiagram
  autonumber
  participant User as User
  participant Chat as /app/chat
  participant API as /api/chat
  participant Agent as Gemini Agent
  participant Tools as Tool Registry
  participant Data as Shopify/Research APIs

  User->>Chat: Prompt ("help me launch a product")
  Chat->>API: message + history
  API->>Agent: system prompt + tools + history

  loop Until final answer
    Agent->>API: tool_call(name, input)
    API->>Tools: execute(name, input)
    Tools->>Data: external action/read
    Data-->>Tools: result
    Tools-->>API: structured result + status
    API-->>Chat: stream tool_event (pending/success/error)
    API->>Agent: tool_result
  end

  Agent-->>API: final assistant response
  API-->>Chat: stream final response
```

## 3) Zero-to-Store Hero Flow

```mermaid
flowchart TD
  A[User: "I want to sell minimalist desk lamps"] --> B[research_market]
  B --> C[research_competitors]
  C --> D[generate_product_listing]
  D --> E[shopify_create_product]
  E --> F[Optional: shopify_discounts_collections]
  F --> G[Assistant summary + next actions]
```

## 4) Safety & Trust Controls

```mermaid
flowchart TD
  IN[Tool Intent] --> RISK{Mutating/Destructive?}
  RISK -- No --> EXEC[Execute Tool]
  RISK -- Yes --> PREVIEW[Action Summary Event]
  PREVIEW --> CONFIRM{User Confirmed?}
  CONFIRM -- No --> STOP[Abort + safe assistant response]
  CONFIRM -- Yes --> EXEC
  EXEC --> LOG[Redacted Action Log]
  LOG --> OUT[Structured Result to UI]
  OUT --> UNDO{Reversible?}
  UNDO -- Yes --> PAYLOAD[Return undo payload]
  UNDO -- No --> END[Complete]
```

## 5) Data Model (MVP)

```mermaid
erDiagram
  CONVERSATIONS ||--o{ MESSAGES : contains
  CONVERSATIONS ||--o{ ACTION_LOG : records

  CONVERSATIONS {
    string id PK
    datetime created_at
    string title
  }

  MESSAGES {
    string id PK
    string conversation_id FK
    string role
    text content
    datetime created_at
  }

  ACTION_LOG {
    string id PK
    string conversation_id FK
    string tool_name
    text input_redacted
    text output_redacted
    string status
    int duration_ms
    datetime created_at
  }
```

## 6) Showcase Readiness Snapshot

```mermaid
flowchart LR
  CORE[Core MVP Engine\nDone] --> UX[UX/UI Polish\nIn Progress]
  UX --> QA[QA + Edge Cases\nIn Progress]
  QA --> SUBMIT[Submission Ready]

  style CORE fill:#052b2b,stroke:#1dd3d8,color:#dfffff
  style UX fill:#2b2105,stroke:#f5c542,color:#fff6d6
  style QA fill:#2b2105,stroke:#f5c542,color:#fff6d6
  style SUBMIT fill:#0d2b05,stroke:#6be675,color:#ddffdd
```
