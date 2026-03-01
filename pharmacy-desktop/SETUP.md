# Pharmacy Desktop — Setup Guide

## Prerequisites
- Node.js 18+
- Rust (https://rustup.rs)
- Tauri CLI v2

## Install Rust + Tauri
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install tauri-cli --version "^2.0"
```

## Run in development (web-only mode, no Rust build)
```bash
cd pharmacy-desktop
npm install
npm run dev
# Open http://localhost:1420 in browser
```

## Run as Tauri Desktop App
```bash
cd pharmacy-desktop
npm run tauri:dev
# This builds the Rust backend + opens the desktop window
```

## Build for production
```bash
npm run tauri:build
# Output in src-tauri/target/release/bundle/
```

## Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
(Already pre-filled with the project's Supabase URL)

## Pages Available
| Route | Page |
|-------|------|
| / | Dashboard |
| /billing | Billing List |
| /billing/new | New Bill |
| /purchase | Drug Purchases |
| /purchase/new | New Purchase |
| /purchase-return | Purchase Returns |
| /sales-return | Sales Returns |
| /inventory | Inventory |
| /prescribed | Prescriptions |
| /department-issue | Dept. Drug Issues |
| /drug-broken | Drug Damage |
| /intent | Medicine Intent |
| /cash-collection | Cash Collection |
| /reports | Reports & Analytics |
| /collection-report | Collection Report |
| /settings/suppliers | Suppliers |
| /settings/medications | Edit Medications |
| /settings/upload-medications | Upload CSV |
| /settings/upload-batches | Upload Batches |
| /settings/bulk-upload | Bulk Excel Upload |
| /settings/batch-validation | Batch Validation |
