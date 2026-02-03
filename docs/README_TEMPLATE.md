# 🚀 Scanly - Link-in-Bio Platform

[![Services](https://img.shields.io/badge/services-18-blue)](docs/SPRINT_MAP.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-000000)](https://fastify.io)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> A modern Linktree alternative with QR codes, analytics, multi-tenancy, and creator monetization tools.

![Scanly Editor Preview](docs/assets/editor-preview.png)

## ✨ Features

| Category | Features |
|----------|----------|
| **Page Builder** | 20+ block types, drag-and-drop, live preview |
| **Themes** | 20+ presets, custom colors, patterns, gradients |
| **QR Codes** | Dynamic QR with branding, analytics, batch print |
| **Analytics** | Real-time clicks, geographic heatmaps, funnels |
| **Teams** | Multi-tenancy, roles, SSO-ready |
| **Monetization** | Tip jar, digital products, subscriptions |
| **Automation** | Workflow builder, webhooks, integrations |

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Gateway   │────▶│  Services   │
│  React/Vite │     │    :3000    │     │  :3001-3030 │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                        ┌──────┴──────┐
                                        │  PostgreSQL │
                                        │   + Redis   │
                                        └─────────────┘
```

**18 Microservices:** Auth, QR, Analytics, Microsite, Creator, Print Studio, Workflow, ML, and more.

## 🚀 Quick Start

```bash
# Clone repos
git clone https://github.com/Scanly-io/qr-backend.git
git clone https://github.com/Scanly-io/qr-frontend.git

# Start backend (Docker)
cd qr-backend
docker-compose up -d

# Start frontend
cd ../qr-frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Sprint Map](docs/SPRINT_MAP.md) | Development journey & feature breakdown |
| [Architecture](ARCHITECTURE_MAP.md) | System design & service interactions |
| [API Guide](docs/API.md) | REST API reference |
| [Environment](ENVIRONMENT.md) | Configuration variables |
| [Docker](DOCKER.md) | Container setup guide |

## 🎯 Roadmap

- [x] **Phase 1:** Core platform (Editor, Themes, QR)
- [x] **Phase 2:** Enterprise (Teams, Analytics, SSO)
- [x] **Phase 3:** Creator tools (Products, Workflows)
- [ ] **Phase 4:** Mobile apps (React Native)
- [ ] **Phase 5:** AI features (Content generation)

## 📊 Stats

| Metric | Value |
|--------|-------|
| Backend Services | 18 |
| Block Types | 20+ |
| Theme Presets | 20+ |
| Lines of Code | 42,000+ |

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © 2026 Scanly
