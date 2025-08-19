# AeonPay - Smart Group Payments

## Overview

AeonPay is a comprehensive financial payment application designed for seamless group spending management. The system enables users to create group plans with spending limits, manage vouchers and mandates, and process payments through multiple modes including QR code scanning. Built as a full-stack monorepo, it features a React frontend with modern UI components and a dual backend architecture supporting both Node.js/Express and Python FastAPI implementations.

The application focuses on intelligent guardrails for over-cap detection, idempotent API operations, and a complete double-entry ledger system for accurate financial reconciliation. Core functionality includes campus-based merchant directories, real-time validation, and comprehensive transaction history tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI System**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for consistent styling
- **State Management**: Zustand for global state management with separate stores for UI and application state
- **Routing**: Wouter for lightweight client-side routing
- **Data Fetching**: TanStack Query (React Query) for server state management with caching and synchronization
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Mobile-First**: Responsive design with glass morphism effects and gradient backgrounds optimized for mobile devices

### Backend Architecture
- **Dual Backend Support**: 
  - Primary: Node.js with Express and TypeScript
  - Alternative: Python FastAPI with SQLAlchemy (partially implemented)
- **Database Layer**: Drizzle ORM with PostgreSQL schema definition, configurable for multiple database providers
- **Authentication**: JWT-based authentication with phone number verification and mock login system
- **Session Management**: In-memory storage with planned PostgreSQL persistence
- **API Design**: RESTful endpoints with consistent response patterns and error handling

### Data Storage and Schema
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: 
  - Users table with phone-based authentication
  - Plans with member management and spending caps
  - Vouchers and mandates for payment processing
  - Merchants organized by campus locations
  - Double-entry ledger for financial reconciliation
  - Idempotent requests table for duplicate prevention
- **Migration Strategy**: Drizzle Kit for schema migrations and database synchronization

### Payment Processing System
- **Multi-Mode Payments**: Support for vouchers, mandates, and split-later options
- **QR Code Integration**: Camera-based QR scanning for merchant payments
- **Guardrails**: Intelligent over-cap detection with user-friendly resolution flows
- **Transaction Lifecycle**: Intent creation, validation, and confirmation with stable response IDs
- **Financial Reconciliation**: Complete double-entry bookkeeping for all transactions

### Security and Reliability
- **Idempotency**: Request deduplication using idempotency keys to prevent duplicate operations
- **JWT Security**: Token-based authentication with configurable expiration
- **Input Validation**: Zod schemas for runtime type checking and validation
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages
- **CORS Configuration**: Proper cross-origin resource sharing setup for development and production

### UI/UX Design Pattern
- **App Shell Architecture**: Bottom navigation with glass morphism container design
- **Modal System**: Centralized modal management with Zustand state
- **Component Library**: Reusable UI components with consistent design tokens
- **Responsive Design**: Mobile-first approach with glass card containers and gradient backgrounds
- **Accessibility**: ARIA-compliant components with keyboard navigation support

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form, React Router (Wouter)
- **TypeScript**: Full TypeScript support with strict type checking
- **Build Tools**: Vite for development and production builds with ESBuild

### UI and Styling
- **Component Library**: Radix UI primitives for accessible base components
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Icons**: Lucide React for consistent iconography
- **Utilities**: clsx and tailwind-merge for conditional styling

### State Management and Data
- **Client State**: Zustand for global state management
- **Server State**: TanStack Query for API state management and caching
- **Database ORM**: Drizzle ORM with PostgreSQL support
- **Validation**: Zod for schema validation and type inference

### Backend Infrastructure
- **Web Framework**: Express.js with TypeScript support
- **Database**: PostgreSQL via Neon Database serverless
- **Authentication**: JWT with jsonwebtoken library
- **Session Storage**: Connect-pg-simple for PostgreSQL session store

### Development and Build Tools
- **Package Manager**: NPM with lockfile for reproducible installs
- **Development Server**: Vite dev server with HMR
- **Type Checking**: TypeScript compiler with strict configuration
- **Database Tools**: Drizzle Kit for migrations and schema management

### Production and Deployment
- **Runtime**: Node.js with ES modules support
- **Process Management**: Configured for production deployment with environment variables
- **Asset Optimization**: Vite production builds with code splitting and optimization
- **Database Connection**: Pooled connections with proper error handling

### Optional Integrations
- **Testing Framework**: Planned integration with Jest/Vitest for unit testing
- **Payment Gateways**: Extensible architecture for real payment provider integration
- **Analytics**: Prepared hooks for user behavior tracking and analytics
- **Push Notifications**: Infrastructure ready for real-time notifications