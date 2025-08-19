# AeonPay - Smart Group Payments

AeonPay is a full-stack financial payment application that enables seamless group spending management with voucher/mandate systems and intelligent guardrails.

## 🚀 Features

### Core Functionality
- **Group Plans**: Create and manage spending plans with member caps
- **Voucher System**: Pre-funded vouchers for events and activities  
- **Mandate System**: Dynamic spending limits with real-time execution
- **Payment Processing**: Multi-mode payments (vouchers/mandates/split later)
- **Guardrails**: Intelligent over-cap detection with user-friendly resolution
- **QR Payments**: Camera-based QR code scanning for merchant payments
- **Double-Entry Ledger**: Accurate financial reconciliation

### Business Logic
- **Idempotent APIs**: Duplicate request prevention with stable response IDs
- **JWT Authentication**: Secure phone-based authentication
- **Campus-Based Merchants**: Location-aware merchant directory
- **Real-time Validation**: Cap enforcement and balance checking
- **Transaction History**: Complete audit trail for all payments

## 🏗️ Architecture

### Backend (Python FastAPI)
