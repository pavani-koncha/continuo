# CONTINUO
### The AI Support Agent That Remembers.

> *"ChatGPT answers the current question. Continuo understands the customer behind the question."*  
> *Every customer. Every conversation. Every important detail — connected.*

---

## 💡 The Problem
In standard customer support, conversations happen across multiple discontinuous sessions.
A customer may say:
- *"We need a security review before signing the contract."*
- *"Our production environment is running on AWS."*
- *"We are experiencing login failures in SSO."*
- *"Please contact our technical team before making any production changes."*
- *"We prefer email communication."*

Later, the customer opens a completely new conversation thread:
> *"Can we sign the contract today?"*

Standard LLM chatbots and conventional support agents only see the current message or thread history. They either say *"Yes, proceed to sign!"* (missing critical blockers) or require the customer to repeat themselves.

---

## ⚡ The Solution: CONTINUO
Continuo gives the AI support agent **persistent, customer-isolated memory** powered by **Hindsight** and high-speed **Groq LPU inference**, protected with **multi-tenant JWT authentication**.

When an interaction happens:
1. **Authenticate**: Ensures the support agent is logged in with isolated tenant access.
2. **Retrieve**: Continuo queries Hindsight for memories specifically tagged to that customer and agent.
3. **Understand**: Combines customer profile + persistent memories + current conversation.
4. **Reason & Answer**: Uses Groq to formulate a personalized, context-aware response that directly addresses historical requirements.
5. **Explain**: Surfaces the exact recalled memory and source conversation for agent auditability.
6. **Act**: Formulates an actionable **Recommended Next Action** with urgency and rationale.
7. **Retain**: Extracts any new requirements, technical changes, or commitments and writes them back to Hindsight.

---

## 🏗️ Architecture & Interaction Flow

```
                      +-----------------------------+
                      |     Agent Authenticated     |
                      |    (JWT Bearer Token)       |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |       Customer Message      |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Customer Identification   |
                      |    (Strict Tenant/Cust ID)  |
                      +-----------------------------+
                                     |
                  +------------------+------------------+
                  |                                     |
                  v                                     v
     +-------------------------+           +-------------------------+
     |   Hindsight Persistent  |           |     Customer Profile    |
     |       Memory Layer      |           |     & Living Context    |
     | (api.hindsight.vectorize.io)|       +-------------------------+
     +-------------------------+                        |
                  |                                     |
                  +------------------+------------------+
                                     |
                                     v
                      +-----------------------------+
                      | Augmented Context Synthesis |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |       Groq AI Engine        |
                      |   (llama-3.3-70b-versatile) |
                      +-----------------------------+
                                     |
                  +------------------+------------------+
                  |                                     |
                  v                                     v
     +-------------------------+           +-------------------------+
     |  Explainable Support    |           | Recommended Next Action |
     |  Response + Recalled    |           | & Unresolved Issue      |
     |  Memory Citations       |           | Tracking                |
     +-------------------------+           +-------------------------+
                  |
                  v
     +-------------------------+
     | Extract New Insights    |
     | -> Write to Hindsight   |
     +-------------------------+
```

---

## 🌟 Key Features

1. **Sign Up, Sign In, and Sign Out Authentication**:
   - Secure account registration and login powered by `bcryptjs` salted password hashing and JWT sessions.
   - Protected dashboard: all customer data, conversations, and intelligence APIs require a valid Bearer token.
   - Live user profile indicator with name, email, avatar, and 1-click Sign Out.
   - Quick 1-Click Demo Login for hackathon evaluation.

2. **Strict Multi-Tenant User Isolation**:
   - Every registered user has their own completely isolated workspace.
   - User B cannot see, access, or query User A's customers, conversation history, or Hindsight memories.

3. **Dynamic Customer Profiles**:
   - Zero hardcoded limits — create any number of enterprise customers with company, product, initial notes, and tags.
   - Complete data persistence.

4. **Genuinely Independent Conversations**:
   - Clicking **"New Conversation"** opens a completely fresh thread without confusing old chat logs.
   - The AI still retrieves relevant cross-session memories from the customer's persistent layer.

5. **Memory Explorer & Auditability**:
   - Transparently view what Continuo remembers categorized into:
     - `Requirement`
     - `Issue`
     - `Preference`
     - `Technical Context`
     - `Commitment`
     - `General Context`

6. **Memory Explainability**:
   - Shows *why* the AI made a recommendation:
     > **Based on previous customer memory:**  
     > *Remembered: "Security review required before contract signing."*  
     > *Source: "Contract & Security Discussion (Oct 8)"*

7. **Recommended Next Best Action**:
   - Every significant response provides a recommended next action for the support team, complete with urgency (`high`, `medium`, `low`) and tactical reasoning.

8. **Unresolved Issue & Blocker Detection**:
   - Detects when an issue is reported vs. when a customer confirms it has been resolved.
   - Dynamic health classification (`Healthy`, `Needs Attention`, `At Risk`).

9. **"Ask Continuo" Support Intelligence**:
   - Support agents can ask ad-hoc questions scoped strictly to the customer:
     - *"What is blocking this customer from signing?"*
     - *"What are their biggest concerns?"*
     - *"What environment are they using?"*

10. **Customer Journey Timeline**:
    - Chronological log of key customer milestones (onboarding, issues opened, memories stored, actions taken).

11. **Modern Dark SaaS UI**:
    - Built with React, TypeScript, Tailwind CSS, Lucide icons, glassmorphism, responsive panels, and smooth micro-interactions.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React |
| **Backend** | Node.js, Express, REST APIs, TypeScript |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs password hashing |
| **Memory Layer** | Hindsight API (`https://api.hindsight.vectorize.io`) + Isolated local persistence |
| **AI Inference** | Groq API (`llama-3.3-70b-versatile` / OpenAI Compatible format) |
| **Data Storage** | Isolated JSON application store + Hindsight vector memory |

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v10+

### 2. Clone and Setup
```bash
git clone <YOUR_REPO_URL>
cd continuo
```

### 3. Backend Setup
```bash
cd backend
npm install

# Copy .env.example
cp .env.example .env
```

Configure your `.env` in `backend/`:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
HINDSIGHT_API_KEY=your_hindsight_api_key_here
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET=your_secure_jwt_secret_here
```

Start backend:
```bash
npm run dev
# Or build and start:
npm run build
npm start
```
*Backend runs on `http://localhost:5000`.*

### 4. Frontend Setup
```bash
cd ../frontend
npm install

# Copy .env.example
cp .env.example .env
```

Configure `.env` in `frontend/`:
```env
# Leave blank for local dev proxy (or set to http://localhost:5000)
VITE_API_URL=
```

Start frontend:
```bash
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🧪 Automated Test Suites

### 1. Full Authentication & Multi-Tenancy Test
```bash
node test_auth_flow.js
```
Validates:
- 401 Unauthorized for unauthenticated requests
- Sign Up with JWT generation
- Duplicate email prevention (409)
- Token verification (`/api/auth/me`)
- Customer & memory isolation between User 1 and User 2
- 404 blocking across tenant boundaries
- Invalid password rejection vs. valid password sign-in

### 2. End-to-End Acceptance Test
```bash
node test_acceptance.js
```
Validates the full 14-step Continuo experience:
- Agent authentication
- Customer A creation (Alex Morgan / NovaTech)
- Thread 1: security review memory stored into Hindsight
- Thread 2: genuine new thread retrieves cross-session memory
- Explainable memory citation & Recommended Next Action card
- Customer B creation & 100% memory isolation
- "Ask Continuo" question answering grounded strictly in customer context

---

## ☁️ Deployment Instructions

### Deploy Backend to Render
1. Create a **New Web Service** on [Render](https://render.com).
2. Connect your GitHub repository.
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to: `npm install && npm run build`
5. Set **Start Command** to: `npm start`
6. Add Environment Variables:
   - `HINDSIGHT_API_KEY`: Your Hindsight API key
   - `HINDSIGHT_API_URL`: `https://api.hindsight.vectorize.io`
   - `GROQ_API_KEY`: Your Groq API key
   - `JWT_SECRET`: Random secure secret key
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g. `https://continuo-app.vercel.app`)
   - `PORT`: `10000` (Render default)

### Deploy Frontend to Vercel
1. Create a **New Project** on [Vercel](https://vercel.com).
2. Connect your GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Framework Preset: **Vite**.
5. Set Environment Variable:
   - `VITE_API_URL`: Your deployed Render backend URL (e.g. `https://continuo-backend.onrender.com`)
6. Click **Deploy**.

---

## 📄 License
MIT License. Built for hackathon demonstration.
