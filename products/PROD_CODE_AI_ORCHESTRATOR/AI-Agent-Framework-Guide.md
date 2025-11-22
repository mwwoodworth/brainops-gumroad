# BrainOps AI Orchestrator Framework

**Version:** 1.0
**License:** Commercial (Single Product)

## Overview
Build your own "AI Agency" or "AI Operating System" using the same Python/FastAPI framework that powers BrainOps. This is not just a chatbot script; it's a scalable backend for orchestrating dozens of AI agents.

## What's Included
1.  **Agent Core (`ai_core.py`)**: The base class for creating autonomous agents.
2.  **Orchestrator Logic**: The "Brain" that routes tasks to the correct specialist agent.
3.  **Memory System**: Architecture for vector-based long-term memory (using Supabase `pgvector`).
4.  **FastAPI Boilerplate**: Production-ready API structure with async endpoints and background tasks.

## Setup Guide
1.  **Install Dependencies**: `pip install -r requirements_minimal.txt`
2.  **Configure Env**: Set `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`.
3.  **Run Server**: `uvicorn main:app --reload`

## How to Create an Agent
1.  Inherit from `BaseAgent`.
2.  Define `system_prompt` and `tools`.
3.  Register with the `Orchestrator`.

## Scaling
This architecture is designed to run on Render or Railway. It uses connection pooling and async IO to handle hundreds of concurrent agent operations.
