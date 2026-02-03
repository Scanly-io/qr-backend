# 🏗️ Architecture Diagrams (Mermaid)

**Auto-renders in GitHub, VS Code, and most Markdown viewers!**

---

## 📊 Diagram 1: Simplified Architecture Overview

```mermaid
graph TB
    Users[Users/Clients] --> Frontend[Frontend<br/>React]
    Frontend --> Gateway[API Gateway<br/>Nginx]
    
    Gateway --> Core[Core Services<br/>6 services]
    Gateway --> ML[AI/ML Services<br/>3 services]
    Gateway --> Support[Supporting Services<br/>10 services]
    
    Core --> DB[(PostgreSQL<br/>12 Databases)]
    ML --> DB
    Support --> DB
    
    Core -.-> Kafka[Kafka<br/>13 Topics]
    ML -.-> Kafka
    Support -.-> Kafka
    
    Core --> Redis[(Redis)]
    
    ML --> OpenAI[OpenAI GPT-4]
    Support --> External[External APIs<br/>SendGrid, etc.]
    
    classDef frontend fill:#3B82F6,stroke:#2563EB,color:#fff
    classDef gateway fill:#8B5CF6,stroke:#7C3AED,color:#fff
    classDef service fill:#10B981,stroke:#059669,color:#fff
    classDef infra fill:#FDE047,stroke:#FACC15,color:#000
    classDef external fill:#EF4444,stroke:#DC2626,color:#fff
    
    class Frontend frontend
    class Gateway gateway
    class Core,ML,Support service
    class DB,Kafka,Redis infra
    class OpenAI,External external
```

---

## 📊 Diagram 1b: Detailed Service Breakdown

```mermaid
graph LR
    subgraph Core["� Core Services (6)"]
        direction TB
        C1[Auth]
        C2[QR]
        C3[Microsite]
        C4[Analytics]
        C5[Domains]
        C6[Routing]
    end
    
    subgraph ML["🟠 AI/ML Services (3)"]
        direction TB
        M1[ML Service]
        M2[Insights]
        M3[Experiments]
    end
    
    subgraph Support["🟣 Supporting Services (10)"]
        direction TB
        S1[Email]
        S2[Integrations]
        S3[Media]
        S4[Pixels]
        S5[Creator]
        S6[Assets]
        S7[Print Studio]
        S8[Workflow]
        S9[DLQ Processor]
        S10[Notifications]
    end
    
    subgraph Infra["⚡ Infrastructure"]
        direction TB
        I1[(PostgreSQL<br/>12 DBs)]
        I2[Kafka<br/>13 Topics]
        I3[(Redis)]
        I4[Cloudflare R2]
    end
    
    Core --> Infra
    ML --> Infra
    Support --> Infra
    
    classDef coreStyle fill:#10B981,stroke:#059669,color:#fff
    classDef mlStyle fill:#F59E0B,stroke:#D97706,color:#fff
    classDef supportStyle fill:#8B5CF6,stroke:#7C3AED,color:#fff
    classDef infraStyle fill:#FDE047,stroke:#FACC15,color:#000
    
    class C1,C2,C3,C4,C5,C6 coreStyle
    class M1,M2,M3 mlStyle
    class S1,S2,S3,S4,S5,S6,S7,S8,S9,S10 supportStyle
    class I1,I2,I3,I4 infraStyle
```

---

## 📊 Diagram 2: QR Scan Flow (Real-Time Event Processing)

```mermaid
sequenceDiagram
    participant User
    participant Routing as Routing Service<br/>(Port 3021)
    participant Analytics as Analytics Service<br/>(Port 3012)
    participant Kafka as Kafka<br/>(qr.scanned topic)
    participant ML as ML Service<br/>(Port 3016)
    participant Microsite as Microsite Service<br/>(Port 3013)
    participant DB as PostgreSQL
    
    User->>Routing: 1. Scan QR Code<br/>scanly.io/abc123
    Note over Routing: Resolve short code<br/>< 50ms
    
    Routing->>DB: 2. Get destination URL
    DB-->>Routing: Return QR data
    
    Routing->>Analytics: 3. Track scan event
    Note over Analytics: Record:<br/>• Device type<br/>• Geo location<br/>• Timestamp
    
    Analytics->>DB: 4. Save scan data
    
    Analytics->>Kafka: 5. Publish "qr.scanned" event
    Note over Kafka: Event payload:<br/>{qr_id, device, location}
    
    Kafka-->>ML: 6. Consume event
    Note over ML: Generate personalized CTA<br/>< 200ms
    
    ML->>Microsite: 7. Request page + CTA
    
    Microsite->>DB: 8. Fetch page template
    DB-->>Microsite: Return page data
    
    Note over Microsite: Inject ML-powered CTA<br/>Apply theme<br/>Render HTML
    
    Microsite-->>User: 9. Show personalized page
    Note over User: Total time: < 500ms
```

---

## 📊 Diagram 3: AI Microsite Generation Pipeline

```mermaid
flowchart TD
    Start([User Submits Prompt<br/>'Create coffee shop page'])
    
    Microsite[Microsite Service<br/>Creates Job ID]
    KafkaReq[Kafka Topic<br/>ml.generation.requested]
    
    MLStart[ML Service<br/>Starts Pipeline]
    
    %% Parallel Processing
    Step1[Step 1: Analyze Prompt<br/>GPT-4 API<br/>Detect industry, tone<br/>2-3 seconds]
    Step2[Step 2: Web Scraping<br/>Playwright<br/>Extract content, colors<br/>5-10 seconds]
    
    Step3[Step 3: Brand Analysis<br/>GPT-4 Vision<br/>Analyze logo, extract colors<br/>3-5 seconds]
    
    Step4[Step 4: Design Generation<br/>Color palette<br/>Font pairing<br/>Layout choice<br/>2-3 seconds]
    
    Step5[Step 5: Content Generation<br/>GPT-4<br/>Headline, description, CTA<br/>3-5 seconds]
    
    Step6[Step 6: HTML Assembly<br/>Combine blocks<br/>Apply theme<br/>WCAG compliance<br/>1-2 seconds]
    
    KafkaComplete[Kafka Topic<br/>ml.generation.complete]
    MicrositeSave[Microsite Service<br/>Save to DB<br/>Assign subdomain<br/>Deploy live]
    
    End([User Gets Live Site<br/>myshop.scanly.io<br/>Total: 10-30 seconds])
    
    Start --> Microsite
    Microsite --> KafkaReq
    KafkaReq --> MLStart
    
    MLStart --> Step1
    MLStart --> Step2
    
    Step1 --> Step3
    Step2 --> Step3
    
    Step3 --> Step4
    Step4 --> Step5
    Step5 --> Step6
    
    Step6 --> KafkaComplete
    KafkaComplete --> MicrositeSave
    MicrositeSave --> End
    
    %% External APIs
    OpenAI[OpenAI GPT-4 API]
    Vision[GPT-4 Vision API]
    Playwright[Playwright Web Scraping]
    
    Step1 -.->|API Call| OpenAI
    Step2 -.->|Scrape| Playwright
    Step3 -.->|API Call| Vision
    Step5 -.->|API Call| OpenAI
    
    %% Styling
    classDef mlStep fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    classDef kafka fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    classDef external fill:#EF4444,stroke:#DC2626,stroke-width:2px,color:#fff
    
    class Step1,Step2,Step3,Step4,Step5,Step6,MLStart mlStep
    class KafkaReq,KafkaComplete kafka
    class OpenAI,Vision,Playwright external
```

---

## 📊 Diagram 4: Database Schema (Multi-Database Strategy)

```mermaid
erDiagram
    %% Auth Service Database
    USERS ||--o{ SESSIONS : has
    USERS {
        uuid id PK
        string email UK
        string password_hash
        string name
        string plan
        timestamp created_at
        timestamp updated_at
    }
    SESSIONS {
        uuid id PK
        uuid user_id FK
        string token
        timestamp expires_at
        timestamp created_at
    }
    
    %% QR Service Database
    USERS ||--o{ QR_CODES : creates
    QR_CODES ||--o{ QR_TEMPLATES : has
    QR_CODES {
        uuid id PK
        uuid user_id FK
        string name
        string destination_url
        string short_code UK
        string qr_image_url
        string template_type
        jsonb customization
        int scan_count
        timestamp created_at
    }
    QR_TEMPLATES {
        uuid id PK
        uuid qr_code_id FK
        string industry
        jsonb config_json
        timestamp created_at
    }
    
    %% Analytics Database
    QR_CODES ||--o{ SCANS : tracked_by
    SCANS ||--o{ SCAN_ANALYTICS : aggregated_into
    SCANS {
        uuid id PK
        uuid qr_code_id FK
        timestamp scanned_at
        string city
        string country
        string device_type
        string os
        string browser
        string referrer
        string ip_address
    }
    SCAN_ANALYTICS {
        uuid id PK
        uuid qr_code_id FK
        date date
        int total_scans
        int unique_scans
        string top_device
        string top_location
    }
    
    %% Microsite Service Database
    USERS ||--o{ PAGES : creates
    QR_CODES ||--o{ PAGES : links_to
    PAGES ||--o{ PAGE_BLOCKS : contains
    PAGES {
        uuid id PK
        uuid user_id FK
        uuid qr_code_id FK
        string subdomain UK
        string title
        jsonb theme
        timestamp created_at
        timestamp updated_at
    }
    PAGE_BLOCKS {
        uuid id PK
        uuid page_id FK
        string block_type
        jsonb content_json
        int order
        timestamp created_at
    }
```

---

## 📊 Diagram 5: Kafka Event Architecture

```mermaid
graph LR
    %% Producers
    subgraph Producers
        AuthSvc[Auth Service]
        QRSvc[QR Service]
        MicrositeSvc[Microsite Service]
        AnalyticsSvc[Analytics Service]
        EmailSvc[Email Service]
        RoutingSvc[Routing Service]
    end
    
    %% Kafka Topics
    subgraph Kafka["Redpanda (Kafka) - 13 Topics"]
        T1[qr.created]
        T2[qr.scanned]
        T3[qr.updated]
        T4[user.registered]
        T5[microsite.created]
        T6[analytics.event]
        T7[ml.generation.requested]
        T8[ml.generation.complete]
        T9[email.queued]
        T10[domain.verified]
        T11[experiment.started]
        T12[dlq.failed]
        T13[notification.sent]
    end
    
    %% Consumers
    subgraph Consumers
        MLSvc[ML Service]
        InsightsSvc[Insights Service]
        DLQProc[DLQ Processor]
        PixelsSvc[Pixels Service]
        NotifSvc[Notification Service]
    end
    
    %% Producer to Topics
    QRSvc -->|Publish| T1
    RoutingSvc -->|Publish| T2
    QRSvc -->|Publish| T3
    AuthSvc -->|Publish| T4
    MicrositeSvc -->|Publish| T5
    AnalyticsSvc -->|Publish| T6
    MicrositeSvc -->|Publish| T7
    MLSvc -->|Publish| T8
    EmailSvc -->|Publish| T9
    RoutingSvc -->|Publish| T10
    AnalyticsSvc -->|Publish| T11
    AuthSvc -->|Publish| T12
    NotifSvc -->|Publish| T13
    
    %% Topics to Consumers
    T1 -->|Consume| AnalyticsSvc
    T1 -->|Consume| InsightsSvc
    T1 -->|Consume| EmailSvc
    
    T2 -->|Consume| AnalyticsSvc
    T2 -->|Consume| MLSvc
    T2 -->|Consume| InsightsSvc
    T2 -->|Consume| PixelsSvc
    
    T4 -->|Consume| EmailSvc
    T4 -->|Consume| AnalyticsSvc
    
    T7 -->|Consume| MLSvc
    T8 -->|Consume| MicrositeSvc
    T8 -->|Consume| EmailSvc
    
    T12 -->|Consume| DLQProc
    
    %% Styling
    classDef producer fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    classDef topic fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    classDef consumer fill:#8B5CF6,stroke:#7C3AED,stroke-width:2px,color:#fff
    
    class AuthSvc,QRSvc,MicrositeSvc,AnalyticsSvc,EmailSvc,RoutingSvc producer
    class T1,T2,T3,T4,T5,T6,T7,T8,T9,T10,T11,T12,T13 topic
    class MLSvc,InsightsSvc,DLQProc,PixelsSvc,NotifSvc consumer
```

---

## 📊 Diagram 6: Deployment Architecture (Docker Compose)

```mermaid
graph TB
    subgraph Docker["Docker Compose Environment"]
        subgraph Frontend["Frontend Container"]
            React[React + Vite<br/>Port 5173]
        end
        
        subgraph Gateway["Gateway Container"]
            Nginx[Nginx<br/>Port 3000]
        end
        
        subgraph Services["Service Containers (19)"]
            S1[Auth :3010]
            S2[QR :3011]
            S3[Analytics :3012]
            S4[Microsite :3013]
            S5[Email :3014]
            S6[Other 14 Services...]
        end
        
        subgraph Data["Data Layer"]
            PG[(PostgreSQL<br/>Port 5432<br/>12 Databases)]
            RK[Redpanda<br/>Port 9092<br/>Kafka]
            RD[(Redis<br/>Port 6379)]
        end
    end
    
    subgraph External["External Services"]
        CF[Cloudflare R2<br/>Object Storage]
        OAI[OpenAI API<br/>GPT-4]
        SG[SendGrid<br/>Email]
        MP[Mixpanel<br/>Analytics]
        ST[Sentry<br/>Error Tracking]
    end
    
    React --> Nginx
    Nginx --> S1
    Nginx --> S2
    Nginx --> S3
    Nginx --> S4
    Nginx --> S5
    Nginx --> S6
    
    S1 --> PG
    S2 --> PG
    S3 --> PG
    S4 --> PG
    S5 --> PG
    S6 --> PG
    
    S1 --> RK
    S2 --> RK
    S3 --> RK
    S4 --> RK
    
    S1 --> RD
    S2 --> RD
    
    S2 --> CF
    S4 --> CF
    S4 --> OAI
    S5 --> SG
    S1 --> MP
    S2 --> MP
    S1 --> ST
    S2 --> ST
    
    classDef container fill:#3B82F6,stroke:#2563EB,stroke-width:2px,color:#fff
    classDef data fill:#FDE047,stroke:#FACC15,stroke-width:2px,color:#000
    classDef external fill:#EF4444,stroke:#DC2626,stroke-width:2px,color:#fff
    
    class React,Nginx,S1,S2,S3,S4,S5,S6 container
    class PG,RK,RD data
    class CF,OAI,SG,MP,ST external
```

---

## 🎯 How to Use These Diagrams

### **In GitHub:**
1. Push this file to your repo
2. GitHub automatically renders Mermaid diagrams
3. View in your README or documentation

### **In VS Code:**
1. Install "Markdown Preview Mermaid Support" extension
2. Open this file
3. Click "Preview" to see rendered diagrams

### **In Presentations:**
1. Use GitHub's rendered view
2. Take screenshots
3. Or export to PDF

### **For LinkedIn:**
1. View diagram in GitHub
2. Take high-quality screenshot
3. Upload to LinkedIn Featured section

---

## 📝 LinkedIn Description

Use this with your diagram screenshots:

```
Architecture Overview: QR & Microsite Platform

Designed and implemented a scalable, event-driven microservices architecture:

🏗️ Architecture:
• 19 microservices (Node.js + TypeScript)
• Multi-database strategy (12 PostgreSQL databases)
• Event-driven communication (Kafka, 13 topics)
• Multi-tenant with custom domain support

🤖 AI/ML Integration:
• OpenAI GPT-4 for AI-powered microsite generation
• Personalized CTAs (6 persuasion types)
• WCAG/ADA compliance automation

📊 Real-Time Analytics:
• Device tracking, geo-location
• Funnel analysis, conversion tracking
• 47+ tracked events (Mixpanel)

🔧 Tech Stack:
• Node.js, TypeScript, PostgreSQL (Drizzle ORM)
• Kafka (Redpanda), Redis, Docker
• OpenAI API, Cloudflare R2
• Mixpanel, Sentry

Built during career transition period (Aug 2025 - Jan 2026).
Currently validating business model with beta users.

#Architecture #Microservices #NodeJS #AI #SaaS
```

---

## 🚀 Next Steps

1. ✅ **Push to GitHub** - Diagrams auto-render
2. ✅ **Add to README** - Showcase your architecture
3. ✅ **Screenshot for LinkedIn** - Visual portfolio
4. ✅ **Use in interviews** - Technical talking points
5. ✅ **Create presentation** - Export diagrams

**Your architecture is now beautifully documented and shareable!** 🎉
