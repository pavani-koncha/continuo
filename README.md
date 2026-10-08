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
Continuo gives the AI support agent **persistent, customer-isolated memory** powered by **Hindsight** and high-speed **Groq LPU inference**.

When an interaction happens:
1. **Retrieve**: Continuo queries Hindsight for memories specifically tagged to that customer.
2. **Understand**: Combines customer profile + persistent memories + current conversation.
3. **Reason & Answer**: Uses Groq to formulate a personalized, context-aware response that directly addresses historical requirements.
4. **Explain**: Surfaces the exact recalled memory and source conversation for agent auditability.
5. **Act**: Formulates an actionable **Recommended Next Action** with urgency and rationale.
6. **Retain**: Extracts any new requirements, technical changes, or commitments and writes them back to Hindsight.

---

## 🏗️ Architecture & Interaction Flow

```
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

1. **Dynamic Customer Profiles**:
   - Zero hardcoded limits — create any number of enterprise customers with company, product, initial notes, and tags.
   - Complete data persistence.

2. **Strict Customer Memory Isolation**:
   - Customer B *never* accesses or leaks Customer A's requirements, credentials, or context.

3. **Genuinely Independent Conversations**:
   - Clicking **"New Conversation"** opens a completely fresh thread without confusing old chat logs.
   - The AI still retrieves relevant cross-session memories from the customer's persistent layer.

4. **Memory Explorer & Auditability**:
   - Transparently view what Continuo remembers categorized into:
     - `Requirement`
     - `Issue`
     - `Preference`
     - `Technical Context`
     - `Commitment`
     - `General Context`

5. **Memory Explainability**:
   - Shows *why* the AI made a recommendation:
     > **Based on previous customer memory:**  
     > *Remembered: "Security review required before contract signing."*  
     > *Source: "Contract & Security Discussion (Oct 8)"*

6. **Recommended Next Best Action**:
   - Every significant response provides a recommended next action for the support team, complete with urgency (`high`, `medium`, `low`) and tactical reasoning.

7. **Unresolved Issue & Blocker Detection**:
   - Detects when an issue is reported vs. when a customer confirms it has been resolved.
   - Dynamic health classification (`Healthy`, `Needs Attention`, `At Risk`).

8. **"Ask Continuo" Support Intelligence**:
   - Support agents can ask ad-hoc questions scoped strictly to the customer:
     - *"What is blocking this customer from signing?"*
     - *"What are their biggest concerns?"*
     - *"What environment are they using?"*

9. **Customer Journey Timeline**:
   - Chronological log of key customer milestones (onboarding, issues opened, memories stored, actions taken).

10. **Modern Dark SaaS UI**:
    - Built with React, TypeScript, Tailwind CSS, Lucide icons, glassmorphism, responsive panels, and smooth micro-interactions.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React |
| **Backend** | Node.js, Express, REST APIs, TypeScript |
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
# Clone the repository
git clone <YOUR_NEW_REPO_URL>
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

## 🧪 Automated Acceptance Test Suite

Run the end-to-end acceptance test validating all 14 criteria:
```bash
node test_acceptance.js
```
This tests:
1. Customer creation
2. Message intake & memory extraction
3. Hindsight memory persistence
4. Fresh conversation thread instantiation
5. Cross-thread memory retrieval
6. Explainable AI response referencing prior memory
7. Recommended Next Best Action formulation
8. Customer B creation & 100% memory isolation
9. Ask Continuo query evaluation

---

## 🎬 3-Minute Hackathon Live Demo Script

1. **Step 1: Open Dashboard**
   - Show high-level metrics: Total Customers, Stored Memories, Open Issues, Health Overview.

2. **Step 2: Add Customer**
   - Click **"+ Add Customer"**.
   - Click **"Fill with Hackathon Demo Preset"** (Alex Morgan, NovaTech, Enterprise Platform).
   - Click **Create Customer**.

3. **Step 3: First Interaction (Establish Memory)**
   - Click into Conversations.
   - Send: *"We need a security review before signing the contract."*
   - Continuo acknowledges and stores the requirement.
   - Show the green badge: **"Retained to Hindsight: Security review required before contract signing."**
   - Show the amber card: **"Recommended Next Action: Coordinate security documentation package"**.

4. **Step 4: Demonstrate Genuine Long-Term Memory (New Thread)**
   - Click **"+ New Conversation"**.
   - Notice the chat area is completely fresh (not displaying old chat).
   - Send: *"Can we sign the contract today?"*
   - Continuo retrieves the remembered blocker:
     > *"Before proceeding with signing, the security review mentioned in your previous conversation still needs to be completed..."*
   - Show the blue explainability banner: **"Based on Previous Customer Memory"**.
   - Show the action card: **"Confirm whether the security review has been completed (High Urgency)"**.

5. **Step 5: Demonstrate "Ask Continuo"**
   - Click the **"Ask Continuo"** button in the header.
   - Ask: *"What is blocking this customer from signing?"*
   - Continuo answers citing the exact security review memory!

6. **Step 6: Demonstrate Customer Isolation**
   - Create Customer B (e.g. Sarah Jenkins / CloudScale).
   - Open Memory Explorer or Ask Continuo for Customer B.
   - Verify zero memories leak from Customer A.

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

## 🔒 Security Best Practices
- Never commit `.env` files (both root, backend, and frontend `.env` are in `.gitignore`).
- All AI and Hindsight API requests are proxied strictly through the backend.
- Customer IDs partition memories so accounts cannot cross-pollinate data.

---

## 📄 License
MIT License. Built for hackathon demonstration.
