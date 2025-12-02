# 🤖 BrainOps AI Orchestrator Framework
### Build Autonomous AI Agents in Python

---

## 🚀 Getting Started

### 1. Overview
This is not a toy script. This is the exact **FastAPI** microservice architecture used to run 59+ autonomous agents in the BrainOps ecosystem. It handles:
*   **Memory Management:** Storing and retrieving context (Vector RAG).
*   **Tool Execution:** Allowing agents to securely call APIs (Gmail, Calendar, Stripe).
*   **Orchestration:** Routing complex user requests to the right specialist agent.

### 2. Installation

1.  **Prerequisites:** Python 3.10+
2.  **Create a Virtual Environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # Linux/Mac
    # venv\Scripts\activate  # Windows
    ```
3.  **Install Dependencies:**
    ```bash
    pip install fastapi uvicorn openai supabase pydantic python-dotenv
    ```

### 3. Structure
*   **`app/main.py`**: The entry point. Starts the FastAPI server.
*   **`app/api/`**: Contains the agent logic.
    *   `brain.py`: The core decision-making engine.
    *   `memory.py`: Handles reading/writing to your vector database.
    *   `gumroad_webhook.py`: Example of an automation trigger.

### 4. Running the Server
```bash
cd app
uvicorn main:app --reload
```
Your AI brain is now live at `http://localhost:8000`.

---

## 🧠 Key Concepts

### The "Unified Brain" Pattern
Instead of building separate bots for everything, this framework uses a **Router** pattern.
1.  User sends a request ("Refund this customer").
2.  **Router Agent** analyzes intent -> Routes to `FinanceAgent`.
3.  `FinanceAgent` retrieves tools (Stripe API) + Context (Refund Policy).
4.  Action is executed and logged.

### Memory System
The `memory.py` module is designed to work with **Supabase pgvector**. It automatically embeds conversation history so your agents "remember" past interactions.

---

## ⚠️ Configuration
Rename `.env.example` to `.env` and add your API keys:
*   `OPENAI_API_KEY`: For the LLM.
*   `SUPABASE_URL` & `KEY`: For memory storage.

---

## 🆘 Support
Building agents is hard. We make it easier. Contact **support@brainops.io** for architecture reviews.
