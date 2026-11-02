import ReactMarkdown from 'react-markdown';
import React,{useEffect,useMemo,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Activity,AlertCircle,ArrowDownRight,ArrowUpRight,BarChart3,Bell,Check,CheckCircle2,ChevronDown,ChevronRight,Clock3,Command,FileText,Filter,FolderKanban,LayoutDashboard,Menu,MessageSquareText,Plus,RefreshCw,Search,Send,Settings,ShieldCheck,Sparkles,Target,TrendingUp,Users,X, Zap,CalendarDays,CircleDot,MoreHorizontal}from'lucide-react';
import{Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis,BarChart,Bar}from'recharts';
import './style.css';
const API='http://localhost:8000/api';
const fmt=(s)=>{try{return new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}catch{return s}};
function App(){
 const [page,setPage]=useState('Overview'),[tasks,setTasks]=useState([]),[metrics,setMetrics]=useState({}),[approvals,setApprovals]=useState([]),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[filter,setFilter]=useState('All'),[selected,setSelected]=useState(null),[history,setHistory]=useState([]),[chat,setChat]=useState([]),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[modal,setModal]=useState(false),[editModal,setEditModal]=useState(false),[toast,setToast]=useState('');
 const refresh=async()=>{setLoading(true);try{let [t,m,a]=await Promise.all([fetch(API+'/tasks').then(r=>r.json()),fetch(API+'/metrics').then(r=>r.json()),fetch(API+'/approvals').then(r=>r.json())]);setTasks(t);setMetrics(m);setApprovals(a)}catch(e){setToast('Backend not reachable. Start FastAPI on port 8000.')}finally{setLoading(false)}};
 useEffect(()=>{refresh()},[]);
 useEffect(()=>{if(toast){let t=setTimeout(()=>setToast(''),3200);return()=>clearTimeout(t)}},[toast]);
 const riskCount=tasks.filter(t=>['High','Critical'].includes(t.risk_level)).length;
 const filtered=useMemo(()=>tasks.filter(t=>(filter==='All'||t.risk_level===filter||t.status===filter)&&`${t.title} ${t.team} ${t.owner}`.toLowerCase().includes(query.toLowerCase())),[tasks,filter,query]);
 const openTask=async t=>{setSelected(t);try{setHistory(await fetch(API+`/tasks/${t.id}/history`).then(r=>r.json()))}catch{setHistory([])}};
 const createRec=async t=>{try{await fetch(API+`/tasks/${t.id}/recommend`,{method:'POST'});await refresh();setToast('Recommendation added to approval queue')}catch{setToast('Could not create recommendation')}};
 const decide=async(id,decision)=>{await fetch(API+`/approvals/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,reviewer:'Project Manager'})});await refresh();setToast(`Recommendation ${decision.toLowerCase()}`)};
 const ask=async e=>{e?.preventDefault();if(!question.trim())return;let q=question;setChat(c=>[...c,{role:'user',text:q}]);setQuestion('');setBusy(true);try{let r=await fetch(API+'/copilot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})}).then(x=>x.json());setChat(c=>[...c,{role:'assistant',text:r.answer,mode:r.mode,evidence:r.evidence||[]}])}catch{setChat(c=>[...c,{role:'assistant',text:'I could not reach the backend. Please check that the API is running.'}])}finally{setBusy(false)}};
 const nav=[['Overview',LayoutDashboard],['Projects & Tasks',FolderKanban],['Risk Intelligence',Activity],['Approvals',ShieldCheck],['AI Copilot',Sparkles]];
 return <div className="shell"><aside className="sidebar"><div className="brand"><div className="brand-mark"><Activity size={19}/></div><div><b>projectpulse<span>.ai</span></b><small>OPERATIONS INTELLIGENCE</small></div></div><div className="workspace"><div className="workspace-icon">N</div><div><b>NxtWave Operations</b><small>Central workspace</small></div><ChevronDown size={15}/></div><div className="nav-label">WORKSPACE</div><nav>{nav.map(([n,I])=><button key={n} className={page===n?'nav-item active':'nav-item'} onClick={()=>{setPage(n);setSelected(null)}}><I size={17}/><span>{n}</span>{n==='Approvals'&&metrics.pending_approvals>0&&<em>{metrics.pending_approvals}</em>}</button>)}</nav><div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Sparkles size={16}/></div><b>AI-powered operations</b><p>Turn team updates into clear decisions, with a human always in control.</p><button onClick={()=>setPage('AI Copilot')}>Explore copilot <ChevronRight size={14}/></button></div><div className="profile"><div className="avatar">MV</div><div><b>Manasa Varma</b><small>Project Admin</small></div><MoreHorizontal size={18}/></div></div></aside>
 <main className="main"><header className="topbar"><div className="crumb">Workspace <ChevronRight size={14}/> <b>{page}</b></div><div className="top-actions"><div className="system-status"><i/> All systems operational</div><button className="icon-btn" onClick={refresh} title="Refresh"><RefreshCw size={17}/></button><button className="icon-btn"><Bell size={17}/><i className="notif-dot"/></button><div className="top-avatar">MV</div></div></header>
 <div className="content">
 {page==='Overview'&&<><div className="page-head"><div><div className="eyebrow"><span className="eyebrow-dot"/> MONDAY, OPERATIONS BRIEFING</div><h1>Good morning, Manasa <span>✦</span></h1><p>Here’s what’s happening across your projects today.</p></div><div className="head-actions"><button className="btn secondary" onClick={refresh}><RefreshCw size={15}/> Refresh data</button><button className="btn primary" onClick={()=>setModal(true)}><Plus size={16}/> New task</button></div></div>
 <div className="hero-strip"><div className="hero-orb"><Sparkles size={21}/></div><div className="hero-copy"><b>Your operations snapshot is ready</b><p>{riskCount} high-priority risks need attention across {metrics.teams||0} teams. Review the action queue before the next checkpoint.</p></div><button onClick={()=>setPage('Risk Intelligence')}>View risk insights <ChevronRight size={15}/></button><div className="hero-glow"/></div>
 <div className="metric-grid"><Metric icon={FolderKanban}label="Active tasks"value={metrics.total_tasks??'—'}sub="Across all teams"tone="blue"/><Metric icon={AlertCircle}label="High-risk tasks"value={metrics.high_risk_tasks??'—'}sub="Require manager attention"tone="red"/><Metric icon={CircleDot}label="Blocked tasks"value={metrics.blocked_tasks??'—'}sub="Waiting on dependencies"tone="amber"/><Metric icon={TrendingUp}label="Average progress"value={`${metrics.average_progress??0}%`}sub="Portfolio completion"tone="green"/></div>
 <div className="section-grid"><section className="panel health-panel"><div className="panel-head"><div><h3>Project health overview</h3><p>Risk distribution across active work</p></div><button className="text-btn" onClick={()=>setPage('Risk Intelligence')}>View details <ChevronRight size={14}/></button></div><div className="health-content"><div className="donut-wrap"><div className="donut" style={{'--high':tasks.filter(t=>['High','Critical'].includes(t.risk_level)).length/Math.max(1,tasks.length)*100+'%','--med':tasks.filter(t=>t.risk_level==='Medium').length/Math.max(1,tasks.length)*100+'%'}}><div><strong>{tasks.length}</strong><small>Total tasks</small></div></div></div><div className="legend">{[['Critical / High','red',tasks.filter(t=>['High','Critical'].includes(t.risk_level)).length],['Medium risk','amber',tasks.filter(t=>t.risk_level==='Medium').length],['Low risk','green',tasks.filter(t=>t.risk_level==='Low').length]].map(([n,c,v])=><div className="legend-row"><i className={c}/><span>{n}</span><b>{v}</b></div>)}</div></div><div className="health-foot"><span><ShieldCheck size={15}/> Risk is evidence-based, not a prediction guarantee.</span><span>Updated just now</span></div></section>
 <section className="panel attention-panel"><div className="panel-head"><div><h3>Needs your attention</h3><p>Prioritized items from the risk engine</p></div><span className="count-pill">{riskCount} items</span></div><div className="attention-list">{tasks.filter(t=>['High','Critical'].includes(t.risk_level)).sort((a,b)=>b.risk_score-a.risk_score).slice(0,3).map(t=><div className="attention-item" onClick={()=>openTask(t)}><div className={`risk-dot ${t.risk_level.toLowerCase()}`}/><div className="attention-main"><b>{t.title}</b><small>{t.team} · {t.owner} · Due {fmt(t.due_date)}</small></div><span className={`risk-tag ${t.risk_level.toLowerCase()}`}>{t.risk_level}</span><ChevronRight size={15}/></div>)}{riskCount===0&&<div className="empty">No high-risk items. Nice work.</div>}</div><button className="panel-bottom-btn" onClick={()=>setPage('Risk Intelligence')}>Open risk intelligence <ArrowUpRight size={15}/></button></section></div>
 <section className="panel task-panel"><div className="panel-head"><div><h3>Project task tracker</h3><p>Live view of work across teams</p></div><button className="text-btn" onClick={()=>setPage('Projects & Tasks')}>All tasks <ChevronRight size={14}/></button></div><TaskTable tasks={tasks.slice(0,5)} onOpen={openTask}/></section>
 <div className="bottom-grid"><section className="panel"><div className="panel-head"><div><h3>Manager action queue</h3><p>Recommendations awaiting review</p></div><span className="count-pill">{approvals.filter(a=>a.decision==='Pending').length} pending</span></div><ApprovalList approvals={approvals.slice(0,2)} decide={decide}/></section><section className="panel ai-promo"><div className="ai-promo-top"><div className="ai-badge"><Sparkles size={17}/></div><span>PROJECTPULSE COPILOT</span></div><h3>Make a better decision,<br/>in less time.</h3><p>Ask questions about blockers, deadlines, dependencies and team progress using your project context.</p><button className="btn dark" onClick={()=>setPage('AI Copilot')}>Open AI copilot <ArrowUpRight size={15}/></button><div className="promo-decoration">✳</div></section></div></>}
 {page==='Projects & Tasks'&&<><PageTitle title="Projects & tasks"sub="A single source of truth for work, ownership and delivery." action={<button className="btn primary" onClick={()=>setModal(true)}><Plus size={16}/> Create task</button>}/><div className="filterbar"><div className="searchbox"><Search size={16}/><input placeholder="Search tasks, teams or owners..." value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Blocked</option><option>In Progress</option></select><button className="btn secondary" onClick={()=>{setFilter('All');setQuery('')}}><Filter size={15}/> Clear filters</button></div><section className="panel"><TaskTable tasks={filtered} onOpen={openTask}/></section></>}
 {page==='Risk Intelligence'&&<><PageTitle title="Risk intelligence"sub="Understand why work is at risk and what to do next."/><div className="metric-grid"><Metric icon={AlertCircle}label="Critical / high" value={riskCount}sub="Immediate manager review"tone="red"/><Metric icon={Clock3}label="Blocked" value={metrics.blocked_tasks??0}sub="Dependency-driven delay"tone="amber"/><Metric icon={ShieldCheck}label="Pending approvals" value={metrics.pending_approvals??0}sub="Human decisions required"tone="blue"/><Metric icon={Target}label="Portfolio progress" value={`${metrics.average_progress??0}%`}sub="Reported completion"tone="green"/></div><div className="risk-cards">{tasks.slice().sort((a,b)=>b.risk_score-a.risk_score).map(t=><div className="panel risk-card"><div className="risk-card-head"><div><span className={`risk-tag ${t.risk_level.toLowerCase()}`}>{t.risk_level} risk · {t.risk_score}/100</span><h3>{t.title}</h3><p>{t.team} · Owner: {t.owner}</p></div><button className="icon-btn" onClick={()=>openTask(t)}><ChevronRight size={17}/></button></div><div className="risk-reasons">{(t.risk_reasons.length?t.risk_reasons:['No strong risk signals detected']).map(r=><span><AlertCircle size={13}/>{r}</span>)}</div><div className="risk-card-foot"><span>Dependency: <b>{t.dependency}</b></span><button className="text-btn" onClick={()=>createRec(t)}>Create recommendation <ArrowUpRight size={14}/></button></div></div>)}</div></>}
 {page==='Approvals'&&<><PageTitle title="Manager approvals"sub="AI recommendations are proposals. You remain accountable for decisions."/><div className="approval-banner"><ShieldCheck size={21}/><div><b>Human-in-the-loop control is active</b><p>No recommendation is escalated automatically. Approve, reject or review every proposed action.</p></div></div><section className="panel"><ApprovalList approvals={approvals} decide={decide} full/></section></>}
 {page==='AI Copilot'&&<><PageTitle title="AI operations copilot"sub="Ask questions grounded in your current project records."/><div className="copilot-layout"><section className="chat-panel"><div className="chat-header"><div className="copilot-avatar"><Sparkles size={19}/></div><div><b>ProjectPulse Copilot</b><small><i/> Connected to project workspace</small></div><span className="secure-label"><ShieldCheck size={13}/> Evidence-aware</span></div><div className="chat-body">{chat.length===0&&<div className="chat-welcome"><div className="welcome-orb"><Sparkles size={26}/></div><h2>What would you like<br/>to understand?</h2><p>I'll analyze the current project data and show the evidence behind my answer.</p><div className="prompt-grid">{['Which tasks need immediate attention?','What blockers are waiting on dependencies?','Summarize progress across teams','What should I ask managers today?'].map(q=><button onClick={()=>setQuestion(q)}>{q}<ArrowUpRight size={14}/></button>)}</div></div>}{chat.map(m=><div className={`chat-message ${m.role}`}><div className="message-avatar">{m.role==='assistant'?<Sparkles size={14}/>: 'MV'}</div><div className="message-content"><div className="message-role">{m.role==='assistant'?'ProjectPulse':'You'} {m.mode&&<span>{m.mode}</span>}</div><div className="ai-response">
  <ReactMarkdown>{m.text}</ReactMarkdown>
</div>{m.evidence?.length>0&&<div className="evidence">Evidence records: {m.evidence.join(' · ')}</div>}</div></div>)}{busy&&<div className="typing">Analyzing project context<span>•••</span></div>}</div><form className="chat-input" onSubmit={ask}><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask about risks, blockers, progress..." /><button disabled={busy||!question.trim()}><Send size={16}/></button></form><div className="chat-disclaimer">AI can make mistakes. Verify important decisions against source updates.</div></section><aside className="copilot-side"><div className="panel"><h3>Workspace context</h3><div className="context-stat"><span>Tasks indexed</span><b>{tasks.length}</b></div><div className="context-stat"><span>High-risk items</span><b>{riskCount}</b></div><div className="context-stat"><span>Blocked tasks</span><b>{metrics.blocked_tasks||0}</b></div><div className="context-stat"><span>Teams</span><b>{metrics.teams||0}</b></div></div><div className="panel guardrail"><ShieldCheck size={20}/><b>Responsible AI guardrails</b><p>Answers use available project records. The copilot cannot approve escalations, change deadlines or assign work.</p></div></aside></div></>}
 </div></main>
 {selected&&<div className="drawer-backdrop" onClick={()=>setSelected(null)}><aside className="drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><span className={`risk-tag ${selected.risk_level.toLowerCase()}`}>{selected.risk_level} risk · {selected.risk_score}/100</span><h2>{selected.title}</h2><p>{selected.team} · {selected.owner}</p></div><button className="icon-btn" onClick={()=>setSelected(null)}><X size={18}/></button></div><div className="drawer-body"><div className="detail-grid"><div><small>STATUS</small><b>{selected.status}</b></div><div><small>PROGRESS</small><b>{selected.progress}%</b></div><div><small>DUE DATE</small><b>{fmt(selected.due_date)}</b></div><div><small>PRIORITY</small><b>{selected.priority}</b></div></div><div className="progress-track"><i style={{width:selected.progress+'%'}}/></div><h4>Risk evidence</h4>{(selected.risk_reasons.length?selected.risk_reasons:['No strong risk signals detected']).map(r=><div className="evidence-row"><AlertCircle size={14}/>{r}</div>)}<h4>Dependency</h4><p>{selected.dependency}</p><h4>Latest update</h4><div className="update-quote">{selected.last_update||selected.description||'No update provided.'}</div><h4>Update history</h4>{history.map(h=><div className="history-item"><div className="history-line"/><b>{h.status} · {h.progress}%</b><small>{new Date(h.created_at).toLocaleString()}</small><p>{h.note}</p></div>)}<button className="btn secondary full-btn" onClick={()=>setEditModal(true)}><FileText size={15}/> Edit task details</button><button className="btn primary full-btn" onClick={()=>createRec(selected)}><Sparkles size={15}/> Generate manager recommendation</button></div></aside></div>}
 {modal&&<TaskModal close={()=>setModal(false)} done={async()=>{setModal(false);await refresh();setToast('Task created successfully')}}/>}{editModal&&selected&&
  <TaskEditModal
    task={selected}
    close={()=>setEditModal(false)}
    done={async(updated)=>{
      setEditModal(false);
      await refresh();
      setSelected(updated);
      setToast('Task updated successfully');
    }}
  />
}
 {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
 </div>
}
function Metric({icon:I,label,value,sub,tone}){return <div className="metric-card"><div className={`metric-icon ${tone}`}><I size={18}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-sub">{sub}</div></div>}
function PageTitle({title,sub,action}){return <div className="page-head inner-head"><div><h1>{title}</h1><p>{sub}</p></div>{action}</div>}
function TaskTable({tasks,onOpen}){return <div className="table-wrap"><table><thead><tr><th>TASK</th><th>TEAM / OWNER</th><th>STATUS</th><th>PROGRESS</th><th>DUE DATE</th><th>RISK</th><th/></tr></thead><tbody>{tasks.map(t=><tr onClick={()=>onOpen(t)}><td><b>{t.title}</b><small>{t.priority} priority</small></td><td><span>{t.team}</span><small>{t.owner}</small></td><td><span className={`status ${t.status.toLowerCase().replace(' ','-')}`}>{t.status}</span></td><td><div className="progress-cell"><div className="progress-track"><i style={{width:t.progress+'%'}}/></div><small>{t.progress}%</small></div></td><td>{new Date(t.due_date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td><td><span className={`risk-tag ${t.risk_level.toLowerCase()}`}>{t.risk_level}</span></td><td><ChevronRight size={15}/></td></tr>)}</tbody></table>{tasks.length===0&&<div className="empty">No tasks match your filters.</div>}</div>}
function ApprovalList({approvals,decide,full=false}){if(!approvals.length)return <div className="empty">No recommendations yet. Generate one from a task's detail panel.</div>;return <div className="approval-list">{approvals.map(a=><div className="approval-item"><div className="approval-icon"><ShieldCheck size={17}/></div><div className="approval-content"><div><b>{a.task_title}</b><span className={`decision ${a.decision.toLowerCase()}`}>{a.decision}</span></div><p>{a.action}</p><small>Evidence: {a.rationale||'Manager review required'}</small>{a.decision==='Pending'&&<div className="approval-actions"><button className="btn approve" onClick={()=>decide(a.id,'Approved')}><Check size={14}/> Approve</button><button className="btn reject" onClick={()=>decide(a.id,'Rejected')}><X size={14}/> Reject</button></div>}</div></div>)}</div>}
function TaskModal({close,done}){const [v,setV]=useState({title:'',team:'Product',owner:'',status:'On Track',progress:0,due_date:new Date(Date.now()+7*86400000).toISOString().slice(0,10),priority:'Medium',dependency:'None',description:''}),[saving,S]=useState(false);const change=(k,x)=>setV(o=>({...o,[k]:x}));const submit=async e=>{e.preventDefault();S(true);try{let r=await fetch(API+'/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)});if(!r.ok)throw Error();await done()}catch{alert('Could not create task. Check backend and required fields.')}finally{S(false)}};return <div className="modal-backdrop" onClick={close}><form className="modal" onSubmit={submit} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><h2>Create a task</h2><p>Add work to the shared operations workspace.</p></div><button type="button" className="icon-btn" onClick={close}><X size={18}/></button></div><label>Task name<input required value={v.title} onChange={e=>change('title',e.target.value)} placeholder="e.g. Complete release readiness review"/></label><div className="form-row"><label>Team<input required value={v.team} onChange={e=>change('team',e.target.value)}/></label><label>Owner<input required value={v.owner} onChange={e=>change('owner',e.target.value)}/></label></div><div className="form-row"><label>Status<select value={v.status} onChange={e=>change('status',e.target.value)}>{['On Track','In Progress','At Risk','Blocked','Completed'].map(x=><option>{x}</option>)}</select></label><label>Priority<select value={v.priority} onChange={e=>change('priority',e.target.value)}>{['Low','Medium','High','Critical'].map(x=><option>{x}</option>)}</select></label></div><div className="form-row"><label>Due date<input type="date" required value={v.due_date} onChange={e=>change('due_date',e.target.value)}/></label><label>Progress (%)<input type="number" min="0" max="100" value={v.progress} onChange={e=>change('progress',Number(e.target.value))}/></label></div><label>Dependency<input value={v.dependency} onChange={e=>change('dependency',e.target.value)}/></label><label>Context / description<textarea rows="3" value={v.description} onChange={e=>change('description',e.target.value)} placeholder="What is the task, and what might affect delivery?"/></label><div className="modal-actions"><button type="button" className="btn secondary" onClick={close}>Cancel</button><button className="btn primary" disabled={saving}>{saving?'Creating...':'Create task'}</button></div></form></div>}
function TaskEditModal({task,close,done}) {
  const [v,setV] = useState({
    title: task.title || '',
    team: task.team || '',
    owner: task.owner || '',
    status: task.status || 'On Track',
    progress: task.progress ?? 0,
    due_date: task.due_date || '',
    priority: task.priority || 'Medium',
    dependency: task.dependency || 'None',
    description: task.description || ''
  });

  const [saving,S] = useState(false);

  const change = (k,x) => setV(o => ({...o,[k]:x}));

  const submit = async e => {
    e.preventDefault();
    S(true);

    try {
      const response = await fetch(API + `/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(v)
      });

      if (!response.ok) throw Error();

      const result = await response.json();
      await done(result.task);

    } catch {
      alert('Could not update task. Check the backend.');
    } finally {
      S(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={close}>
      <form className="modal" onSubmit={submit}
        onClick={e => e.stopPropagation()}>

        <div className="modal-head">
          <div>
            <h2>Edit task</h2>
            <p>Update task details in the operations workspace.</p>
          </div>
          <button type="button" className="icon-btn" onClick={close}>
            <X size={18}/>
          </button>
        </div>

        <label>
          Task name
          <input required value={v.title}
            onChange={e=>change('title',e.target.value)}/>
        </label>

        <div className="form-row">
          <label>
            Team
            <input required value={v.team}
              onChange={e=>change('team',e.target.value)}/>
          </label>
          <label>
            Owner
            <input required value={v.owner}
              onChange={e=>change('owner',e.target.value)}/>
          </label>
        </div>

        <div className="form-row">
          <label>
            Status
            <select value={v.status}
              onChange={e=>change('status',e.target.value)}>
              {['On Track','In Progress','At Risk','Blocked','Completed'].map(x=>
                <option key={x}>{x}</option>
              )}
            </select>
          </label>

          <label>
            Priority
            <select value={v.priority}
              onChange={e=>change('priority',e.target.value)}>
              {['Low','Medium','High','Critical'].map(x=>
                <option key={x}>{x}</option>
              )}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Due date
            <input type="date" required value={v.due_date}
              onChange={e=>change('due_date',e.target.value)}/>
          </label>

          <label>
            Progress (%)
            <input type="number" min="0" max="100"
              value={v.progress}
              onChange={e=>change('progress',Number(e.target.value))}/>
          </label>
        </div>

        <label>
          Dependency
          <input value={v.dependency}
            onChange={e=>change('dependency',e.target.value)}/>
        </label>

        <label>
          Context / description
          <textarea rows="3" value={v.description}
            onChange={e=>change('description',e.target.value)}/>
        </label>

        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" disabled={saving}>
            {saving?'Saving...':'Save changes'}
          </button>
        </div>

      </form>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
