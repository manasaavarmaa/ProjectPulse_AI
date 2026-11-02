# ProjectPulse AI — Full-Stack Prototype

A hybrid enterprise operations command center developed for the NxtWave Associate Project Management Intern assignment.

## Product Capabilities

- React + Vite frontend with a responsive hybrid interface.
- FastAPI backend providing REST APIs.
- SQLite persistence for tasks, update history, and manager approvals.
- Explainable risk scoring based on task status, due dates, progress, and dependency signals.
- AI recommendation queue with manager approve/reject actions.
- Project Copilot powered by the Gemini API when configured, with deterministic rule-based fallback.
- Task creation, task editing, structured updates, and task history.
- Portfolio-level project metrics and risk visibility.

## Technology Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Python, FastAPI
- **Database:** SQLite, SQLAlchemy
- **AI Integration:** Google Gemini API
- **API Documentation:** Swagger UI

## Run Locally

### 1. Backend Setup

Open a terminal in the project root and run:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

**Windows (Command Prompt):**

```cmd
.venv\Scripts\activate
```

**macOS/Linux:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your local environment file from the example:

**Windows (Command Prompt):**

```cmd
copy .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Add your Gemini API key to `backend/.env` if you want to enable Gemini integration.

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

API documentation: http://localhost:8000/docs

### 2. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually:

http://localhost:5173

### 3. Optional Gemini Integration

Configure these variables in `backend/.env`:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=your_model_name
```

Use a model name supported by your Gemini API configuration. The Project Copilot uses Gemini when a valid API key and supported model are configured. If the key is missing or an API request fails, the application uses its rule-based fallback.

**Never commit `.env` files or expose API keys in frontend code.**

## Database and Demo Data

The backend uses SQLite for persistent storage.

The database file `projectpulse.db` is created in the backend directory. Sample project tasks are initialized when the database is first created.

To reset the local demo data, stop the backend and delete the database file before restarting the application. This removes the local database and its stored task, update, and approval records.

## API Routes

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| GET | `/api/tasks` | Retrieve tasks |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/{id}` | Edit task details |
| POST | `/api/tasks/{id}/updates` | Submit a task update |
| GET | `/api/tasks/{id}/history` | Retrieve task history |
| POST | `/api/tasks/{id}/recommend` | Generate a recommendation |
| GET | `/api/approvals` | Retrieve approvals |
| PATCH | `/api/approvals/{id}` | Approve or reject a recommendation |
| GET | `/api/metrics` | Retrieve portfolio metrics |
| POST | `/api/copilot` | Ask the Project Copilot |

## Important Limitations

- The risk engine uses explainable heuristic scoring. It is not a validated predictive machine-learning model.
- Gemini integration is optional. Without a configured API key, the Copilot uses deterministic fallback logic.
- Slack, Microsoft Teams, Jira, and Google Workspace integrations are not implemented in this prototype.
- Authentication, role-based authorization, production secrets management, automated testing, monitoring, and deployment hardening are not included.
- Manager approval is required for recommendation decisions. The application does not autonomously escalate tasks.

## Demo Safety

Use fictional sample data only. Do not upload confidential company information to an unapproved model or service.

## Project Purpose

ProjectPulse AI demonstrates how AI-assisted project management can improve task visibility, identify operational risks, support decision-making, and maintain accountability through human-reviewed recommendations.
