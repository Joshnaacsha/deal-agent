# 🤖 Deal Agent – Multi-Agent RFP Evaluation System

The **Deal Agent** is an AI-powered multi-agent system that analyzes **RFPs (Request for Proposals)** to help pre-sales teams make better qualification decisions.  

It leverages **LangChain + LangGraph**, **Gemini/OpenAI LLMs**, and **Supabase** for Retrieval-Augmented Generation (RAG).  
The frontend is built with **React + Tailwind**, and the backend with **Node.js (TypeScript)**.

---

## ✨ Features
- 🧩 **Multi-agent workflow** (Red Flag, Strategy, Readiness, RAG Answering)
- 📊 **Weighted scorecard** for RFP evaluation
- ⚡ **Real-time streaming** responses from LLM
- ❓ **Follow-up question suggestions** based on context
- 💬 **React frontend** with chat-style Q&A
- 🗄 **Supabase vector DB** for document storage & retrieval

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Joshnaacsha/deal-agent.git
cd deal-agent
2. Install dependencies
Frontend

bash
Copy code
cd frontend
npm install
Backend

bash
Copy code
cd ../backend
npm install
3. Set up environment variables
Backend (backend/.env)

env
Copy code
PORT=3001

# LLM Keys
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key   # optional fallback

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: Local Ollama setup
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
Frontend (frontend/.env)

env
Copy code
VITE_API_URL=http://localhost:3001
4. Run the Application
Start backend

bash
Copy code
cd backend
npm run build
npm start
Start frontend

bash
Copy code
cd frontend
npm run dev
👉 Open your browser at: http://localhost:5173

🧠 Agent Workflow
Red Flag Agent – Detects risks (biased scope, unrealistic timeline, etc.)

Strategy Agent – Scores strategic fit, feasibility, and ROI

Readiness Agent – Evaluates customer maturity and stakeholder clarity

Summary Agent – Generates pursuit recommendation

RAG Agent – Answers user queries grounded in RFP documents

📂 Tech Stack
Backend: Node.js (TypeScript), LangChain, LangGraph

Frontend: React, Tailwind CSS

Database: Supabase (Vector DB for RAG)

LLMs: Gemini 2.0 Flash, OpenAI (optional), Ollama (local models)

✅ Example Use Case
Upload an RFP PDF

Agents analyze it across strategic fit, risks, and readiness

Get a go/no-go recommendation with supporting insights

Ask follow-up questions in a chat interface, grounded only in the RFP

📜 License
This project is licensed under the MIT License.
