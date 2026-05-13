<div align="center">

# Tax Books Manager

**Desktop app for managing SUNAT electronic tax books — purchases and sales.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8D8.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-local-003B57.svg)](https://www.sqlite.org/)

</div>

---

A cross-platform desktop application (Windows, macOS, Linux) for registering and managing electronic accounting books (*Libros Electrónicos*) required by SUNAT — Peru's tax authority. Supports multi-company, multi-period workflows with CSV/ZIP import and export in SUNAT format, PDF/Excel reporting, and offline-first SQLite storage.

## Screenshots

| Welcome | Company Registration |
|---------|---------------------|
| ![Welcome screen](docs/screenshots/screenshot-onboarding.png) | ![Company registration](docs/screenshots/screenshot-company-registration.png) |

| Dashboard | Sales Book |
|-----------|------------|
| ![Dashboard](docs/screenshots/screenshot-dashboard.png) | ![Sales book](docs/screenshots/screenshot-sales.png) |

## Features

- **Multi-company** — register and switch between multiple RUC companies
- **Sales & Purchases books** — inline editing, validation, and SUNAT field mapping
- **Import** — CSV and bulk ZIP files in SUNAT 8.1/14.1 format with field validation
- **Export** — PDF, Excel (XLSX), CSV, and bulk ZIP per period
- **Dashboard** — period metrics, financial summary, yearly analytics with ECharts
- **Offline-first** — all data stored locally in SQLite via Tauri plugin-sql
- **RUC lookup** — auto-fill company data from peruapi.com

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop runtime | Tauri v2 (Rust) |
| Frontend | React 19, TypeScript, Vite |
| UI | Shadcn/Radix UI, Tailwind CSS |
| Forms | React Hook Form + Zod |
| Table | TanStack Table v8 |
| Database | SQLite (Tauri plugin-sql) |
| Charts | ECharts |
| Export | jsPDF, XLSX, jsZip |

## Local development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 11+ (`npm install -g pnpm`)
- [Rust](https://rustup.rs/) (stable toolchain)
- [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Setup

```bash
git clone https://github.com/RayverAimar/tax-books-manager.git
cd tax-books-manager

pnpm install
```

### Run

```bash
# Web-only (no SQLite, no file system — UI preview)
pnpm dev

# Full desktop app with Tauri
pnpm tauri dev
```

### Build

```bash
# Type-check + frontend bundle
pnpm build:check

# Full desktop installer (outputs to src-tauri/target/release/bundle/)
pnpm tauri build
```

### Other commands

```bash
pnpm type-check     # TypeScript type validation
pnpm lint           # ESLint
pnpm format         # Prettier
pnpm test           # Vitest (841 tests)
```

## Project structure

```
tax-books-manager/
├── src/
│   ├── app/                    # Root component and routing
│   ├── core/
│   │   ├── domain/             # Entities and repository interfaces
│   │   ├── infrastructure/     # SQLite repository implementations
│   │   ├── presentation/       # Contexts (Company, Period) and hooks
│   │   └── services/           # API Peru service (RUC lookup)
│   ├── features/
│   │   ├── dashboard/          # Period metrics, analytics, bulk import/export
│   │   ├── onboarding/         # Company registration flow
│   │   ├── purchases/          # Purchases book (columns, import, transform)
│   │   └── sales/              # Sales book (columns, import, transform)
│   └── shared/
│       ├── components/         # UI primitives, DataTable, forms, templates
│       ├── constants/          # SUNAT field registry, validation rules
│       ├── hooks/              # useInvoiceData, useImport, useExport, etc.
│       ├── lib/                # Import/export engines, formatters, validators
│       └── types/              # SUNAT catalog types, invoice types
├── src-tauri/                  # Rust backend (Tauri app config, Cargo.toml)
├── .github/workflows/          # CI: type-check, lint, build, security audit
└── docs/screenshots/
```
