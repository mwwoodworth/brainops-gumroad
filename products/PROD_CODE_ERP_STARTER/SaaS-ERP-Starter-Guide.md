# SaaS ERP Starter Kit

**Version:** 1.0
**License:** Commercial (Single Product)

## Overview
This pack provides the architecture, database schema, and core service patterns used to build "WeatherCraft ERP"—a production-grade, enterprise-ready SaaS application.

**Note:** This is a "White Label" starter kit. It includes the structural code and patterns, stripped of proprietary business logic.

## What's Included
1.  **Architecture Reference (`ARCHITECTURE.md`)**: Deep dive into the Next.js + Supabase architecture.
2.  **Database Schema (`schema.sql`)**: The exact SQL to set up a multi-tenant ERP database with Customers, Jobs, Invoices, and Estimates tables.
3.  **Service Layer Pattern**: A reusable TypeScript pattern for separating business logic from API routes (Crucial for scaling!).
4.  **Authentication Setup**: Guide to configuring Supabase Auth with RLS (Row Level Security) for tenancy.

## Quick Start
1.  **Database**: Run `schema.sql` in your Supabase SQL Editor.
2.  **Backend**: Copy the `services/` folder structure to your Next.js project.
3.  **Frontend**: Use the provided `EstimateDetailClient` component as a reference for complex forms.

## Key Patterns
- **Server Actions**: How to handle form submissions securely.
- **Optimistic Updates**: Making the UI feel instant.
- **Real-time**: Using Supabase subscriptions for live job updates.

## Support
Contact `support@brainops.com` for architectural questions.
