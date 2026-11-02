import os, json, re
from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from dotenv import load_dotenv
import requests

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./projectpulse.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(240), nullable=False)
    team = Column(String(100), nullable=False)
    owner = Column(String(120), nullable=False)
    status = Column(String(40), default="On Track")
    progress = Column(Integer, default=0)
    due_date = Column(String(20), nullable=False)
    priority = Column(String(30), default="Medium")
    dependency = Column(String(240), default="None")
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updates = relationship("Update", back_populates="task", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="task", cascade="all, delete-orphan")

class Update(Base):
    __tablename__ = "updates"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    owner = Column(String(120), nullable=False)
    status = Column(String(40), nullable=False)
    progress = Column(Integer, nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    task = relationship("Task", back_populates="updates")

class Approval(Base):
    __tablename__ = "approvals"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    decision = Column(String(30), default="Pending")
    action = Column(Text, nullable=False)
    rationale = Column(Text, default="")
    reviewer = Column(String(120), default="Project Manager")
    created_at = Column(DateTime, default=datetime.utcnow)
    task = relationship("Task", back_populates="approvals")

Base.metadata.create_all(bind=engine)
app = FastAPI(title="ProjectPulse AI API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

class TaskIn(BaseModel):
    title: str
    team: str
    owner: str
    status: str = "On Track"
    progress: int = Field(ge=0, le=100)
    due_date: str
    priority: str = "Medium"
    dependency: str = "None"
    description: str = ""

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    team: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    due_date: Optional[str] = None
    priority: Optional[str] = None
    dependency: Optional[str] = None
    description: Optional[str] = None
    
class UpdateIn(BaseModel):
    owner: str
    status: str
    progress: int = Field(ge=0, le=100)
    note: str

class ApprovalIn(BaseModel):
    decision: str
    reviewer: str = "Project Manager"
    rationale: str = ""


def risk_for(task):
    score, reasons = 0, []

    try:
        days = (date.fromisoformat(task.due_date) - date.today()).days
    except (ValueError, TypeError):
        days = 999

    status = (task.status or "").lower()
    text = f"{task.description} {task.dependency}".lower()

    # 1. Task status risk
    if status == "blocked":
        score += 45
        reasons.append("Task is explicitly marked blocked")
    elif status == "at risk":
        score += 30
        reasons.append("Owner status is At Risk")

    # 2. Deadline risk
    if days < 0 and task.progress < 100:
        score += 35
        reasons.append(f"Due date passed by {abs(days)} day(s)")
    elif days <= 2 and task.progress < 70:
        score += 25
        reasons.append("Due within 2 days with progress below 70%")

    # 3. Unconfirmed owner risk
    confirmation_terms = [
        "owner confirmation",
        "owner confirmations",
        "not confirmed",
        "unconfirmed",
        "awaiting confirmation",
        "pending confirmation"
    ]

    if any(term in text for term in confirmation_terms):
        score += 20
        reasons.append("One or more owner confirmations are pending")

    # 4. General dependency and delay risk
    delay_terms = [
        "waiting", "delay", "pending",
        "failing", "dependency", "approval"
    ]

    if any(term in text for term in delay_terms):
        score += 15
        reasons.append("Dependency or delay signal found in task context")

    # 5. Low progress risk
    if task.progress < 25 and status != "completed":
        score += 10
        reasons.append("Progress is below 25%")

    # Final risk score
    score = min(score, 100)

    level = (
        "Critical" if score >= 75
        else "High" if score >= 55
        else "Medium" if score >= 30
        else "Low"
    )

    return score, level, reasons


def task_json(t, db):
    score, level, reasons = risk_for(t)
    last = db.query(Update).filter(Update.task_id==t.id).order_by(Update.created_at.desc()).first()
    pending = db.query(Approval).filter(Approval.task_id==t.id, Approval.decision=="Pending").count()
    return {"id":t.id,"title":t.title,"team":t.team,"owner":t.owner,"status":t.status,"progress":t.progress,
            "due_date":t.due_date,"priority":t.priority,"dependency":t.dependency,"description":t.description,
            "risk_score":score,"risk_level":level,"risk_reasons":reasons,"pending_approvals":pending,
            "last_update":last.note if last else t.description,"updated_at":last.created_at.isoformat() if last else t.created_at.isoformat()}

@app.on_event("startup")
def seed():
    db=SessionLocal()
    if db.query(Task).count()==0:
        samples=[
        Task(title="Finalize onboarding flow",team="Product",owner="Aarav",status="In Progress",progress=70,due_date=(date.today()+timedelta(days=3)).isoformat(),priority="High",dependency="Backend API contract",description="Frontend is mostly complete. Waiting for API response format from backend team."),
        Task(title="Publish authentication API",team="Engineering",owner="Diya",status="At Risk",progress=45,due_date=(date.today()+timedelta(days=1)).isoformat(),priority="Critical",dependency="Security review",description="API tests are failing intermittently. Needs backend review before integration."),
        Task(title="Prepare launch checklist",team="Operations",owner="Kabir",status="In Progress",progress=55,due_date=(date.today()+timedelta(days=6)).isoformat(),priority="Medium",dependency="Owner confirmations",description="Checklist draft is ready. Two owners have not confirmed their tasks."),
        Task(title="Approve launch campaign copy",team="Marketing",owner="Meera",status="Blocked",progress=20,due_date=date.today().isoformat(),priority="High",dependency="Legal approval",description="Blocked because legal approval has not arrived. Follow-up sent yesterday."),
        Task(title="Review user feedback",team="Product",owner="Ishaan",status="On Track",progress=90,due_date=(date.today()+timedelta(days=4)).isoformat(),priority="Low",dependency="None",description="Feedback review is nearly complete. No major issues identified.")
        ]
        db.add_all(samples); db.commit()
        for t in db.query(Task).all():
            db.add(Update(task_id=t.id,owner=t.owner,status=t.status,progress=t.progress,note=t.description))
        db.commit()
    db.close()

@app.get("/api/health")
def health(): return {"status":"ok","service":"ProjectPulse AI","version":"2.0.0"}

@app.get("/api/tasks")
def list_tasks(db:Session=Depends(get_db)):
    return [task_json(t,db) for t in db.query(Task).order_by(Task.id.desc()).all()]

@app.post("/api/tasks")
def create_task(payload:TaskIn, db:Session=Depends(get_db)):
    t=Task(**payload.model_dump()); db.add(t); db.commit(); db.refresh(t)
    db.add(Update(task_id=t.id,owner=t.owner,status=t.status,progress=t.progress,note=t.description or "Task created")); db.commit()
    return task_json(t,db)

@app.post("/api/tasks/{task_id}/updates")
def add_update(task_id:int,payload:UpdateIn,db:Session=Depends(get_db)):
    t=db.query(Task).filter(Task.id==task_id).first()
    if not t: raise HTTPException(404,"Task not found")
    u=Update(task_id=task_id,**payload.model_dump()); db.add(u)
    t.owner=payload.owner; t.status=payload.status; t.progress=payload.progress
    db.commit(); db.refresh(t)
    return {"message":"Update recorded","task":task_json(t,db)}

@app.patch("/api/tasks/{task_id}")
def edit_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()

    if not t:
        raise HTTPException(404, "Task not found")

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(t, field, value)

    db.commit()
    db.refresh(t)

    return {
        "message": "Task updated successfully",
        "task": task_json(t, db)
    }

@app.get("/api/tasks/{task_id}/history")
def history(task_id:int,db:Session=Depends(get_db)):
    t=db.query(Task).filter(Task.id==task_id).first()
    if not t: raise HTTPException(404,"Task not found")
    return [{"id":u.id,"owner":u.owner,"status":u.status,"progress":u.progress,"note":u.note,"created_at":u.created_at.isoformat()} for u in db.query(Update).filter(Update.task_id==task_id).order_by(Update.created_at.desc()).all()]

@app.post("/api/tasks/{task_id}/recommend")
def recommend(task_id:int,db:Session=Depends(get_db)):
    t=db.query(Task).filter(Task.id==task_id).first()
    if not t: raise HTTPException(404,"Task not found")
    score,level,reasons=risk_for(t)
    if t.status=="Blocked":
        action=f"Contact the dependency owner for '{t.dependency}' and request a committed ETA. If no response by the next checkpoint, escalate."
    elif level in ["Critical","High"]:
        action="Manager review today: confirm recovery owner, mitigation, and revised delivery date."
    elif level=="Medium":
        action="Request an owner update at the next checkpoint and verify dependency status."
    else: action="Continue normal tracking and review at the next scheduled checkpoint."
    a=Approval(task_id=t.id,action=action,rationale="; ".join(reasons) or "No strong risk signal detected")
    db.add(a); db.commit(); db.refresh(a)
    return {"id":a.id,"task_id":t.id,"action":action,"rationale":a.rationale,"decision":a.decision}

@app.get("/api/approvals")
def approvals(db:Session=Depends(get_db)):
    rows=db.query(Approval).order_by(Approval.created_at.desc()).all()
    return [{"id":a.id,"task_id":a.task_id,"task_title":a.task.title if a.task else "Unknown","decision":a.decision,"action":a.action,"rationale":a.rationale,"reviewer":a.reviewer,"created_at":a.created_at.isoformat()} for a in rows]

@app.patch("/api/approvals/{approval_id}")
def decide(approval_id:int,payload:ApprovalIn,db:Session=Depends(get_db)):
    if payload.decision not in ["Approved","Rejected","Edited"]:
        raise HTTPException(400,"Decision must be Approved, Rejected or Edited")
    a=db.query(Approval).filter(Approval.id==approval_id).first()
    if not a: raise HTTPException(404,"Approval not found")
    a.decision=payload.decision; a.reviewer=payload.reviewer
    if payload.rationale: a.rationale=payload.rationale
    db.commit()
    return {"message":f"Recommendation {payload.decision.lower()}","id":a.id}

@app.get("/api/metrics")
def metrics(db:Session=Depends(get_db)):
    tasks=db.query(Task).all(); enriched=[task_json(t,db) for t in tasks]
    total=len(tasks); blocked=sum(1 for t in tasks if t.status=="Blocked")
    high=sum(1 for t in enriched if t["risk_level"] in ["High","Critical"])
    avg=round(sum(t.progress for t in tasks)/total) if total else 0
    return {"total_tasks":total,"blocked_tasks":blocked,"high_risk_tasks":high,"average_progress":avg,
            "teams":len(set(t.team for t in tasks)),"pending_approvals":db.query(Approval).filter(Approval.decision=="Pending").count()}

@app.post("/api/copilot")
def copilot(payload:dict,db:Session=Depends(get_db)):
    question=str(payload.get("question","")).strip()
    if not question: raise HTTPException(400,"Question is required")
    tasks=[task_json(t,db) for t in db.query(Task).all()]
    api_key=os.getenv("GEMINI_API_KEY")
    if api_key:
        prompt=("You are ProjectPulse, a cautious project operations copilot. Answer only from supplied project data. "
        "Cite task titles as evidence. Distinguish facts from inference. Never invent dates or owners. "
        "Do not claim to have executed actions. A human manager approves escalations.\n\n"
        f"PROJECT DATA:\n{json.dumps(tasks)}\n\nQUESTION: {question}")
        model=os.getenv("GEMINI_MODEL","gemini-2.5-flash")
        try:
            url=f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            res=requests.post(url,json={"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"temperature":0.2}},timeout=35)
            res.raise_for_status()
            answer=res.json()["candidates"][0]["content"]["parts"][0]["text"]
            return {"answer":answer,"mode":"Gemini AI","evidence":[t["title"] for t in tasks if t["risk_level"] in ["High","Critical"]]}
        except Exception as e:
            print("GEMINI API ERROR:", repr(e))
    q=question.lower()
    risky=[t for t in tasks if t["risk_level"] in ["High","Critical"]]
    blocked=[t for t in tasks if t["status"]=="Blocked"]
    if any(w in q for w in ["block","stuck","dependency"]):
        answer="Blocked work: "+("; ".join(f'{t["title"]} ({t["team"]}) — dependency: {t["dependency"]}' for t in blocked) if blocked else "No tasks are explicitly marked blocked.")
    elif any(w in q for w in ["risk","miss","deadline","attention"]):
        answer="Highest-priority risks: "+("; ".join(f'{t["title"]} — {t["risk_level"]} risk ({t["risk_score"]}/100), owner {t["owner"]}. Evidence: {", ".join(t["risk_reasons"])}' for t in sorted(risky,key=lambda x:x["risk_score"],reverse=True)) if risky else "No high/critical risks currently detected.")
    elif any(w in q for w in ["team","perform","progress"]):
        answer=f"Across {len(tasks)} tasks, average progress is {round(sum(t['progress'] for t in tasks)/max(1,len(tasks)))}%. "+("; ".join(f'{team}: {round(sum(t["progress"] for t in tasks if t["team"]==team)/len([t for t in tasks if t["team"]==team]))}% average progress' for team in sorted(set(t["team"] for t in tasks))))
    else:
        answer=f"I can summarize blockers, delivery risks, team progress and recommended next actions. There are {len(tasks)} tasks, {len(blocked)} blocked and {len(risky)} high/critical risk. Try asking: 'Which tasks need attention?'"
    return {"answer":answer,"mode":"Rule-based fallback","evidence":[t["title"] for t in risky+blocked]}
