# 🔄 Request Flow: Producer-Consumer Pattern

**Simple visualization of how requests flow through the system**

---

## 📊 Producer → Kafka → Consumer Flow

```mermaid
graph LR
    subgraph Client["📱 Client Layer"]
        User[User]
        Browser[Browser/App]
    end
    
    subgraph Gateway["🚪 Gateway Layer"]
        Nginx[Nginx<br/>Port 3000]
        Auth[Auth Service<br/>JWT Validation]
    end
    
    subgraph AuthDB["� Auth Database"]
        AuthDBStorage[(auth_service<br/>users, sessions)]
    end
    
    subgraph Producers["📤 Business Services (Create Events)"]
        QR[QR Service]
        Routing[Routing Service<br/>⚠️ Public - No Auth]
        Microsite[Microsite Service]
    end
    
    subgraph ProducerDBs["💾 Service Databases"]
        QRDB[(qr_service)]
        RoutingDB[(routing_db)]
        MicrositeDB[(microsite_service)]
    end
    
    subgraph MessageBus["📮 Message Bus"]
        Kafka[(Kafka/Redpanda<br/>13 Topics)]
    end
    
    subgraph Consumers["📥 Consumers (Process Events)"]
        Analytics[Analytics Service]
        ML[ML Service]
        Email[Email Service]
        Insights[Insights Service]
    end
    
    subgraph ConsumerDBs["💾 Consumer Databases"]
        AnalyticsDB[(qr_analytics)]
        IntegrationsDB[(integrations_db)]
        WorkflowDB[(workflow_db)]
    end
    
    subgraph Shared["⚡ Shared Infrastructure"]
        Redis[(Redis<br/>Cache)]
    end
    
    User --> Browser
    Browser -->|HTTP Request| Nginx
    
    Nginx -->|Validate JWT| Auth
    Auth -->|Check| AuthDBStorage
    
    Auth -->|✅ Authenticated| QR
    Auth -->|✅ Authenticated| Microsite
    
    Nginx -->|⚠️ Public Access| Routing
    
    QR -->|Owns| QRDB
    Routing -->|Owns| RoutingDB
    Microsite -->|Owns| MicrositeDB
    
    Producers -->|Publish Event| Kafka
    Kafka -->|Subscribe| Consumers
    
    Analytics -->|Owns| AnalyticsDB
    Email -->|Owns| IntegrationsDB
    Insights -->|Owns| WorkflowDB
    
    Auth --> Redis
    QR --> Redis
    
    classDef client fill:#60A5FA,stroke:#3B82F6,color:#fff
    classDef gateway fill:#8B5CF6,stroke:#7C3AED,color:#fff
    classDef producer fill:#10B981,stroke:#059669,color:#fff
    classDef consumer fill:#F59E0B,stroke:#D97706,color:#fff
    classDef message fill:#EC4899,stroke:#DB2777,color:#fff
    classDef storage fill:#FDE047,stroke:#FACC15,color:#000
    
    class User,Browser client
    class Nginx gateway
    class Auth,QR,Routing,Microsite producer
    class Analytics,ML,Email,Insights consumer
    class Kafka message
    class DB,Redis storage
```

---

## 📊 Detailed Event Flow with Topics

```mermaid
sequenceDiagram
    participant User
    participant Gateway as API Gateway
    participant Producer as Producer Service
    participant Kafka as Kafka Topics
    participant Consumer as Consumer Services
    participant DB as PostgreSQL
    
    User->>Gateway: HTTP Request
    Gateway->>Producer: Route to Service
    Producer->>DB: Save Data
    Producer->>Kafka: Publish Event
    Note over Kafka: Topic: qr.created,<br/>user.registered, etc.
    Kafka->>Consumer: Deliver Event
    Consumer->>DB: Process & Save
    Consumer-->>User: Response/Notification
```

---

## 📋 Event Topics & Handlers

```mermaid
graph TB
    subgraph Topics["📮 Kafka Topics (13)"]
        T1[qr.created]
        T2[qr.scanned]
        T3[user.registered]
        T4[microsite.created]
        T5[ml.generation.requested]
        T6[ml.generation.complete]
        T7[analytics.event]
    end
    
    subgraph P["📤 Producers"]
        P1[QR Service]
        P2[Routing Service]
        P3[Auth Service]
        P4[Microsite Service]
        P5[ML Service]
    end
    
    subgraph C["📥 Consumers"]
        C1[Analytics]
        C2[ML Service]
        C3[Email]
        C4[Insights]
        C5[Microsite]
    end
    
    P1 -->|Publish| T1
    P2 -->|Publish| T2
    P3 -->|Publish| T3
    P4 -->|Publish| T4
    P4 -->|Publish| T5
    P5 -->|Publish| T6
    
    T1 -->|Subscribe| C1
    T1 -->|Subscribe| C3
    
    T2 -->|Subscribe| C1
    T2 -->|Subscribe| C2
    T2 -->|Subscribe| C4
    
    T3 -->|Subscribe| C1
    T3 -->|Subscribe| C3
    
    T5 -->|Subscribe| C2
    T6 -->|Subscribe| C5
    T6 -->|Subscribe| C3
    
    classDef topic fill:#EC4899,stroke:#DB2777,color:#fff
    classDef producer fill:#10B981,stroke:#059669,color:#fff
    classDef consumer fill:#F59E0B,stroke:#D97706,color:#fff
    
    class T1,T2,T3,T4,T5,T6,T7 topic
    class P1,P2,P3,P4,P5 producer
    class C1,C2,C3,C4,C5 consumer
```

---

## 🎯 Key Patterns

### **Synchronous (Request-Response)**
```
User → Gateway → Service → Database → Response
```
- Used for: Authentication, QR creation, Page fetching
- Latency: < 200ms

### **Asynchronous (Event-Driven)**
```
Service → Kafka Topic → Consumer Services
```
- Used for: Analytics, Email notifications, ML processing
- Decouples services, improves reliability

### **Pub/Sub Pattern**
```
1 Producer → 1 Topic → Multiple Consumers
```
Example: `qr.scanned` event consumed by Analytics, ML, and Insights

---

## 💡 Benefits

✅ **Loose Coupling** - Services don't need to know about each other  
✅ **Scalability** - Add more consumers to handle load  
✅ **Reliability** - Messages persisted in Kafka  
✅ **Async Processing** - Don't block user requests  
✅ **Event Sourcing** - Full audit trail of all events
