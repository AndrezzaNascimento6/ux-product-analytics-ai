
import {useMemo,useRef,useState,type FormEvent,type ReactNode} from "react";
import {
  Activity,ArrowRight,ArrowUpRight,BarChart3,BrainCircuit,Check,CheckCircle2,
  ChevronLeft,ChevronRight,Clock3,Copy,Database,Download,ExternalLink,
  FileSpreadsheet,Globe2,LayoutDashboard,Lightbulb,LockKeyhole,Menu,
  MousePointerClick,Radio,RefreshCw,ShieldCheck,Sparkles,Target,
  TrendingUp,Users,X,Zap,AlertCircle
} from "lucide-react";
import {
  computeMetrics,exportCSV,makeSyntheticEvents,useEventStream,
  type Metrics,type Step,type UXEvent
} from "./analytics";

type Page="overview"|"journey"|"research";
type Source="combined"|"observed";

const PROMPT=[
  "Act as a UX Researcher analyzing the attached SIGNAL CSV of onboarding events.",
  "First distinguish synthetic baseline data from observed demo interactions; never call synthetic sessions real users.",
  "Calculate funnel conversion (flow_started -> profile completed -> goals completed -> flow_completed),",
  "abandonment by step, validation errors and average completion time. State all denominators and sample sizes.",
  "Separate observed facts, hypotheses and suggested experiments. Do not infer causality, demographics or motivations.",
  "Provide three testable UX hypotheses, two inclusive design recommendations and a concise portfolio summary.",
  "Recommend what qualitative research would be needed to validate each hypothesis."
].join("\n");

const percent=(n:number)=>n.toFixed(1)+"%";
const nfmt=(n:number)=>new Intl.NumberFormat("en-US").format(n);
const seconds=(n:number)=>n>0?Math.floor(n/60)+"m "+Math.round(n%60)+"s":"—";
const labelForEvent:Record<string,string>={
  flow_started:"Journey started",step_viewed:"Step viewed",
  step_completed:"Step completed",validation_error:"Validation friction",
  flow_completed:"Journey completed",flow_abandoned:"Journey abandoned"
};
const stepLabel:Record<Step,string>={
  welcome:"Welcome",profile:"Personal details",goals:"Your goals",review:"Review",complete:"Completed"
};

function Symbol(){return <div className="brand-symbol" aria-hidden="true"><span/><span/><span/></div>}
function Header({page,onMenu,menuOpen,status}:{
  page:Page;onMenu:()=>void;menuOpen:boolean;status:string;
}){
  const names:Record<Page,string>={overview:"Overview",journey:"Experience lab",research:"AI research"};
  return <header className="topbar">
    <div className="topbar-location"><span>WORKSPACE</span><ChevronRight size={13}/><strong>{names[page]}</strong></div>
    <div className="topbar-right">
      <span className="project-status"><span className="status-pulse"/> {status}</span>
      <div className="avatar-bubble" title="Design experiment">S</div>
      <button className="icon-button mobile-menu-button" aria-label={menuOpen?"Close navigation":"Open navigation"}
        aria-expanded={menuOpen} onClick={onMenu}>{menuOpen?<X size={20}/>:<Menu size={20}/>}</button>
    </div>
  </header>;
}
function Sidebar({page,setPage,open,close}:{
  page:Page;setPage:(p:Page)=>void;open:boolean;close:()=>void
}){
  const links=[
    {key:"overview" as const,name:"Analytics overview",icon:LayoutDashboard},
    {key:"journey" as const,name:"Experience lab",icon:MousePointerClick},
    {key:"research" as const,name:"AI research assistant",icon:BrainCircuit}
  ];
  return <>
    {open&&<button className="sidebar-scrim" aria-label="Close navigation" onClick={close}/>}
    <aside className={"sidebar"+(open?" sidebar-open":"")}>
      <div className="sidebar-brand"><Symbol/><div><strong>signal<span>.</span></strong><small>PRODUCT INTELLIGENCE</small></div></div>
      <div className="sidebar-workspace"><span className="workspace-cube"><BarChart3 size={20}/></span><div><strong>Research workspace</strong><small>Onboarding experiment</small></div><ChevronRight size={15}/></div>
      <span className="nav-section-title">WORKSPACE</span>
      <nav className="side-links" aria-label="Main navigation">
        {links.map(link=><button key={link.key} className={page===link.key?"active":""}
          aria-current={page===link.key?"page":undefined} onClick={()=>{setPage(link.key);close()}}>
          <link.icon size={19} strokeWidth={1.9}/><span>{link.name}</span>{page===link.key&&<i/>}</button>)}
      </nav>
      <div className="side-divider"/>
      <span className="nav-section-title">PROJECT</span>
      <div className="side-project-note"><span className="project-note-icon"><Sparkles size={17}/></span>
        <div><strong>UX + Data + AI</strong><p>From user actions to more thoughtful product decisions.</p></div></div>
      <div className="sidebar-bottom">
        <div className="mini-insight"><span className="mini-insight-label"><span className="mini-dot"/> RESEARCH NOTE</span><p>Good products are built on <em>understanding</em>, not assumptions.</p></div>
        <div className="sidebar-footer"><span className="avatar-tiny">S</span><div><strong>SIGNAL / LAB 01</strong><small>Independent design study</small></div></div>
      </div>
    </aside>
  </>;
}
function PageIntro({eyebrow,title,accent,subtitle,aside}:{
  eyebrow:string;title:string;accent:string;subtitle:string;aside?:ReactNode
}){
  return <div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/>{eyebrow}</div>
    <h1>{title} <em>{accent}</em></h1><p>{subtitle}</p></div>{aside&&<div className="page-intro-action">{aside}</div>}</div>;
}
function CardShell({children,className=""}:{children:ReactNode;className?:string}){
  return <section className={"surface "+className}>{children}</section>;
}
function SectionHeading({icon,title,tag,description}:{
  icon?:ReactNode;title:string;tag?:string;description?:string
}){
  return <div className="section-heading"><div className="section-heading-main">
    {icon&&<div className="section-heading-icon">{icon}</div>}
    <div><h2>{title}</h2>{description&&<p>{description}</p>}</div></div>{tag&&<span className="section-tag">{tag}</span>}</div>;
}
function TinySparkline({values,positive=true}:{values:number[];positive?:boolean}){
  const max=Math.max(...values,1),min=Math.min(...values,0),range=Math.max(max-min,1);
  const points=values.map((v,i)=>(i*(118/(values.length-1)))+","+(32-(v-min)/range*26)).join(" ");
  return <svg viewBox="0 0 118 36" aria-hidden="true" className={"sparkline "+(positive?"positive":"negative")}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function StatCard({label,value,detail,icon,values,color}:{
 label:string;value:string;detail:string;icon:ReactNode;values:number[];color:"mint"|"purple"|"peach"|"blue"
}){
 return <div className={"stat-card stat-"+color}>
   <div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div>
   <div className="stat-value">{value}</div>
   <div className="stat-bottom"><span>{detail}</span><TinySparkline values={values}/></div>
 </div>;
}
function TrendChart({daily}:{daily:Metrics["daily"]}){
 const x=(i:number)=>46+i*(560/6);
 const y=(v:number)=>200-Math.min(v,100)*1.68;
 const path=daily.map((d,i)=>(i===0?"M":"L")+x(i)+" "+y(d.rate)).join(" ");
 const fill=path+" L "+x(6)+" 200 L "+x(0)+" 200 Z";
 const ticks=[100,75,50,25,0];
 return <div className="trend-wrap">
   <div className="trend-title"><div><strong>Completion trend</strong><span>7-day conversion rate</span></div>
     <span className="legend"><i/> Completion rate</span></div>
   <svg className="trend-chart" viewBox="0 0 650 258" role="img"
     aria-label={"Daily journey completion rates: "+daily.map(d=>d.label+" "+percent(d.rate)).join(", ")}>
     <defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a3dfb0" stopOpacity=".4"/><stop offset="1" stopColor="#a3dfb0" stopOpacity=".015"/></linearGradient></defs>
     {ticks.map(t=><g key={t}><line x1="46" y1={y(t)} x2="606" y2={y(t)} stroke="#e7ebec" strokeDasharray="4 5"/>
       <text x="32" y={y(t)+4} textAnchor="end" fontSize="11" fill="#8c9a9d">{t}%</text></g>)}
     <path d={fill} fill="url(#trend-fill)"/><path d={path} fill="none" stroke="#2a8e6e" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
     {daily.map((d,i)=><g key={d.date}><circle cx={x(i)} cy={y(d.rate)} r="4.5" fill="#2a8e6e" stroke="#fff" strokeWidth="2.5"/><text x={x(i)} y="234" fontSize="12" textAnchor="middle" fill="#819093">{d.label}</text></g>)}
   </svg>
 </div>;
}
function Funnel({metrics}:{metrics:Metrics}){
 return <CardShell className="funnel-card">
  <SectionHeading title="Journey funnel" icon={<Target size={19}/>} tag="4 STAGES" description="Where people move forward — and where they stop."/>
  <div className="funnel-list">{metrics.funnel.map((item,i)=><div className="funnel-row" key={item.step}>
    <div className="funnel-row-header"><span><b>{"0"+(i+1)}</b>{item.step}</span><strong>{nfmt(item.count)} <small>{percent(item.percent)}</small></strong></div>
    <div className="funnel-track"><div style={{width:item.percent+"%"}} className={"funnel-bar funnel-"+i}/></div>
  </div>)}</div>
  <p className="card-footnote"><AlertCircle size={14}/> Based on distinct journey sessions, not page views.</p>
 </CardShell>;
}
function LiveFeed({events}:{events:UXEvent[]}){
 const recent=events.filter(ev=>ev.source==="observed").slice(-5).reverse();
 return <CardShell className="feed-card">
  <SectionHeading title="Live event stream" icon={<Radio size={19}/>} tag="OBSERVED" description="Anonymous interactions from the prototype."/>
  {recent.length===0?<div className="feed-empty"><div><Activity size={28}/></div><strong>Waiting for your first event</strong><p>Open the experience lab and start the onboarding flow. Your activity will appear here instantly.</p></div>:
  <div className="event-list" role="log" aria-label="Latest onboarding events">{recent.map(event=><div className="event-item" key={event.id}>
    <span className={"event-mark "+(event.event_name==="flow_completed"?"mark-success":event.event_name==="validation_error"?"mark-error":"")}>{event.event_name==="flow_completed"?<Check size={14}/>:event.event_name==="validation_error"?<AlertCircle size={14}/>:<Activity size={14}/>}</span>
    <div><strong>{labelForEvent[event.event_name]}</strong><span>{stepLabel[event.step]} · session {event.session_id.slice(0,6)}</span></div><time>{new Date(event.created_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</time>
  </div>)}</div>}
 </CardShell>;
}
function Overview({metrics,allEvents,source,setSource,openJourney,openResearch,syncStatus}:{
 metrics:Metrics;allEvents:UXEvent[];source:Source;setSource:(s:Source)=>void;
 openJourney:()=>void;openResearch:()=>void;syncStatus:string
}){
 const baseline=source==="combined";
 const rates=metrics.daily.map(d=>d.rate);
 return <>
  <PageIntro eyebrow="UX RESEARCH / LIVE EXPERIMENT" title="Make sense of" accent="every interaction."
    subtitle="A product analytics playground connecting real user actions, UX metrics, and research-ready insights."
    aside={<button className="button-primary" onClick={openJourney}>Try the experience <ArrowUpRight size={17}/></button>}/>
  <div className="notice-banner"><span className="notice-icon"><Zap size={18}/></span>
    <div><strong>See the story behind the numbers.</strong><span>Complete the product flow, then return here to watch the KPIs change.</span></div>
    <button onClick={openJourney}>Open prototype <ArrowRight size={16}/></button></div>
  <div className="data-toolbar"><div className="data-toolbar-left"><span className="live-ring"><span/></span>
    <span>{syncStatus==="connected"?"SUPABASE REALTIME":syncStatus==="error"?"CLOUD CONNECTION ISSUE":"LOCAL REAL-TIME DEMO"}</span>
    <i/> <span className="toolbar-muted">Updated on interaction</span></div>
    <div className="segmented" role="group" aria-label="Data source">
      <button aria-pressed={baseline} className={baseline?"selected":""} onClick={()=>setSource("combined")}>All data</button>
      <button aria-pressed={!baseline} className={!baseline?"selected":""} onClick={()=>setSource("observed")}>Observed only</button>
    </div>
  </div>
  <div className="stats-grid">
    <StatCard label="Journey starts" value={nfmt(metrics.starts)} detail="Unique onboarding sessions" icon={<Users size={19}/>} color="blue" values={metrics.daily.map(d=>d.started)}/>
    <StatCard label="Completion rate" value={percent(metrics.completionRate)} detail="Completed / started" icon={<TrendingUp size={19}/>} color="mint" values={rates}/>
    <StatCard label="Abandonment rate" value={percent(metrics.abandonmentRate)} detail="Explicitly abandoned journeys" icon={<Activity size={19}/>} color="peach" values={rates.map(v=>100-v)}/>
    <StatCard label="Avg. completion time" value={seconds(metrics.avgTimeSeconds)} detail="For completed sessions" icon={<Clock3 size={19}/>} color="purple" values={rates}/>
  </div>
  <div className="analytics-grid">
    <CardShell className="trend-card">
      <SectionHeading title="Performance overview" icon={<BarChart3 size={19}/>} tag="LAST 7 DAYS" description="Understand progress before jumping to conclusions."/>
      <TrendChart daily={metrics.daily}/>
    </CardShell>
    <Funnel metrics={metrics}/>
  </div>
  <div className="analytics-grid bottom-grid">
    <LiveFeed events={allEvents}/>
    <CardShell className="insight-summary">
      <div className="insight-top"><span><Lightbulb size={19}/></span><span>RESEARCH SIGNAL</span></div>
      <h2>Numbers tell you <em>where.</em><br/>Research tells you <em>why.</em></h2>
      <p>{metrics.errorCount>0? "Validation errors appeared "+nfmt(metrics.errorCount)+(metrics.errorCount===1?" time":" times")+". This is a friction signal worth investigating, not proof of the cause.":"No validation errors in the selected sample. Keep testing before concluding the experience is friction-free."}</p>
      <button onClick={openResearch}>Explore hypotheses <ArrowUpRight size={18}/></button>
    </CardShell>
  </div>
  <div className="data-disclaimer"><ShieldCheck size={17}/><span>
    {baseline?"Includes 196 explicitly synthetic reference sessions plus observed prototype events.":"Shows only observed demo interactions. These are not recruited research participants."}
    {" "}No sensitive form values are collected. {syncStatus==="connected"?"Cloud events are shared across visitors.":"Cloud syncing requires optional Supabase setup."}
  </span></div>
 </>;
}

type JourneyStage="welcome"|"profile"|"goals"|"review"|"complete";
type Goal="Save more"|"Start investing"|"Plan a trip"|null;

function Journey({track,observed,goOverview}:{
 track:(session:string,name:UXEvent["event_name"],step:Step,duration?:number|null)=>UXEvent;
 observed:UXEvent[];goOverview:()=>void
}){
 const [stage,setStage]=useState<JourneyStage>("welcome");
 const [fullName,setName]=useState("");
 const [email,setEmail]=useState("");
 const [goal,setGoal]=useState<Goal>(null);
 const [error,setError]=useState("");
 const session=useRef("");
 const startedAt=useRef(0);
 const currentEvents=observed.filter(e=>e.session_id===session.current);
 const start=()=>{
   session.current=crypto.randomUUID();startedAt.current=Date.now();
   setName("");setEmail("");setGoal(null);setError("");
   track(session.current,"flow_started","welcome");
   track(session.current,"step_viewed","profile");
   setStage("profile");
 };
 const validateProfile=(event:FormEvent<HTMLFormElement>)=>{
   event.preventDefault();
   if(fullName.trim().length<2||!/^\S+@\S+\.\S+$/.test(email.trim())){
     setError("Please enter a name and a valid email to continue.");
     track(session.current,"validation_error","profile");return;
   }
   setError("");track(session.current,"step_completed","profile");
   track(session.current,"step_viewed","goals");setStage("goals");
 };
 const finishGoals=()=>{
   if(!goal){setError("Choose one goal to continue.");track(session.current,"validation_error","goals");return}
   setError("");track(session.current,"step_completed","goals");
   track(session.current,"step_viewed","review");setStage("review");
 };
 const backTo=(destination:"profile"|"goals")=>{
   setError("");setStage(destination);track(session.current,"step_viewed",destination);
 };
 const finish=()=>{
   track(session.current,"flow_completed","complete",Date.now()-startedAt.current);
   setStage("complete");
 };
 const abandon=()=>{
   if(stage!=="welcome"&&stage!=="complete"){
     track(session.current,"flow_abandoned",stage==="review"?"review":stage);
   }
   setStage("welcome");setError("");setName("");setEmail("");setGoal(null);
 };
 const currentIndex=stage==="profile"?0:stage==="goals"?1:2;
 return <>
  <PageIntro eyebrow="EXPERIENCE LAB / INTERACTIVE PRODUCT" title="Every action" accent="leaves a signal."
    subtitle="Try a fictional financial wellness onboarding flow. Each step sends anonymous events to the dashboard."
    aside={<button className="button-outline" onClick={goOverview}>View live analytics <ArrowUpRight size={17}/></button>}/>
  <div className="experiment-warning"><LockKeyhole size={17}/><span>Research prototype. No actual account is created. Form entries stay in your browser and are never sent to analytics.</span></div>
  <div className="journey-layout">
   <div className="journey-explainer">
     <div className="experiment-no">EXPERIMENT 001 <span> / </span> ONBOARDING</div>
     <h2>An experience that<br/><em>explains itself.</em></h2>
     <p>Watch how an everyday product flow generates measurable events — with no random counter animations.</p>
     <div className="how-it-works"><div><span>01</span><div><strong>Interact</strong><small>Move through a fictional onboarding journey.</small></div></div>
       <div><span>02</span><div><strong>Track</strong><small>Anonymous step, completion and error events.</small></div></div>
       <div><span>03</span><div><strong>Understand</strong><small>See where the experience works or needs research.</small></div></div></div>
     <div className="session-widget"><div className="session-head"><Radio size={18}/><strong>SESSION ACTIVITY</strong><span className="live-mark">LIVE</span></div>
       <div className="session-events"><strong>{nfmt(currentEvents.length)}</strong><span>events from this journey</span></div>
       <div className="session-tags"><span>{stage==="welcome"?"Not started":stage==="complete"?"Completed":stepLabel[stage]}</span><span>PII-FREE</span></div>
     </div>
   </div>
   <div className="experience-stage">
     <div className="stage-orb stage-orb-one"/><div className="stage-orb stage-orb-two"/>
     <div className="phone-device">
       <div className="phone-bezel"><div className="phone-screen">
         <div className="device-status" aria-hidden="true"><span>9:41</span><span>●●● ▰</span></div>
         <div className="aurora-header"><div className="aurora-logo">aurora<span>✳</span></div><span className="aurora-demo">DEMO</span></div>
         {stage==="welcome"?<div className="onboarding-welcome" key="welcome">
           <div className="welcome-visual" aria-hidden="true"><div className="welcome-inner-orbit"/><Sparkles size={67} strokeWidth={.9}/></div>
           <span className="product-eyebrow">A MORE INTENTIONAL MONEY EXPERIENCE</span>
           <h3>Make room<br/>for <em>more.</em></h3><p>Let's make a little space for the things that matter to you.</p>
           <button className="device-primary" onClick={start}>Get started <ArrowRight size={19}/></button>
           <small>Explore a fictional onboarding flow.</small>
         </div>:stage==="complete"?<div className="onboarding-done" key="complete">
           <div className="done-icon"><CheckCircle2 size={64}/></div><span className="product-eyebrow">JOURNEY COMPLETED</span>
           <h3>You're all<br/><em>set.</em></h3>
           <p>That was a demo! Your journey has been recorded as anonymous analytics events.</p>
           <button className="device-primary" onClick={start}>Try another journey <RefreshCw size={18}/></button>
           <button className="device-link" onClick={goOverview}>See your impact on KPIs <ArrowUpRight size={16}/></button>
         </div>:<div className="onboarding-form" key={stage}>
           <div className="phone-step-head"><span>YOUR JOURNEY</span><span>{currentIndex+1} OF 3</span></div>
           <div className="phone-progress"><span style={{width:((currentIndex+1)/3*100)+"%"}}/></div>
           {stage==="profile"?<form onSubmit={validateProfile} noValidate>
             <span className="product-eyebrow">STEP 01 / THE BASICS</span>
             <h3>Let's start<br/><em>with you.</em></h3>
             <p>Just a couple of details to personalize this experience.</p>
             <label className="device-field">FULL NAME<input autoComplete="off" value={fullName} onChange={e=>setName(e.target.value)} placeholder="e.g. Alex Morgan"/></label>
             <label className="device-field">EMAIL ADDRESS<input type="email" autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} placeholder="alex@example.com"/></label>
             {error&&<p className="device-error" role="alert">{error}</p>}
             <button className="device-primary" type="submit">Continue <ArrowRight size={18}/></button>
           </form>:stage==="goals"?<div>
             <span className="product-eyebrow">STEP 02 / YOUR PRIORITIES</span>
             <h3>What moves<br/><em>you forward?</em></h3><p>Pick the goal that matters most right now.</p>
             <div className="goal-options" role="group" aria-label="Choose a financial goal">
               {(["Save more","Start investing","Plan a trip"] as const).map((option,i)=><button className={goal===option?"chosen":""}
                aria-pressed={goal===option} key={option} onClick={()=>{setGoal(option);setError("")}}>
                  <span>{i===0?<Target size={17}/>:i===1?<TrendingUp size={17}/>:<Globe2 size={17}/>}</span>{option}<span className="goal-check">{goal===option?<Check size={15}/>:null}</span>
                </button>)}
             </div>
             {error&&<p className="device-error" role="alert">{error}</p>}
             <button className="device-primary" onClick={finishGoals}>Continue <ArrowRight size={18}/></button>
             <button className="device-link" onClick={()=>backTo("profile")}><ChevronLeft size={15}/> Back</button>
           </div>:<div>
             <span className="product-eyebrow">STEP 03 / ONE LAST LOOK</span>
             <h3>Ready to<br/><em>begin?</em></h3><p>Here's a quick summary of your demo journey.</p>
             <div className="review-details"><div><span>NAME</span><strong>{fullName}</strong></div>
               <div><span>EMAIL</span><strong>{email}</strong></div>
               <div><span>YOUR GOAL</span><strong>{goal}</strong></div></div>
             <button className="device-primary" onClick={finish}>Complete demo <Check size={18}/></button>
             <button className="device-link" onClick={()=>backTo("goals")}><ChevronLeft size={15}/> Back</button>
           </div>}
         </div>}
         {stage!=="welcome"&&stage!=="complete"&&<button className="abandon-flow" onClick={abandon}>Exit demo</button>}
         <div className="device-homebar" aria-hidden="true"/>
       </div></div>
     </div>
     <div className="device-caption"><span className="small-live-dot"/> INTERACTIVE PROTOTYPE <span className="caption-divider"/> ANONYMOUS TELEMETRY</div>
   </div>
  </div>
 </>;
}
function Research({metrics,events,goJourney}:{metrics:Metrics;events:UXEvent[];goJourney:()=>void}){
 const [copied,setCopied]=useState(false);
 const sortedFriction=[...metrics.friction].sort((a,b)=>b.errors+b.abandons-(a.errors+a.abandons));
 const most=sortedFriction[0];
 const hypotheses=[
   {num:"01",tag:"FRICTION HYPOTHESIS",title:"Could form validation be disrupting momentum?",
    detail:metrics.errorCount+" validation error events were recorded. Investigate which rules or error messages may cause hesitation.",
    method:"Test inline feedback + moderated usability sessions."},
   {num:"02",tag:"FUNNEL HYPOTHESIS",title:"Where does the journey feel most demanding?",
    detail:(most?most.step:"Profile")+" has the most combined validation and abandonment signals in the selected dataset. This is correlation, not cause.",
    method:"Compare the step sequence with interview findings."},
   {num:"03",tag:"TIME HYPOTHESIS",title:"Does a shorter path increase confidence?",
    detail:"Completed journeys average "+seconds(metrics.avgTimeSeconds)+". Duration alone does not reveal satisfaction or comprehension.",
    method:"Run an A/B flow experiment and measure comprehension."}
 ];
 const copyPrompt=async()=>{
   try{await navigator.clipboard.writeText(PROMPT);setCopied(true);setTimeout(()=>setCopied(false),2200)}
   catch{setCopied(false)}
 };
 return <>
  <PageIntro eyebrow="AI + UX RESEARCH / FROM DATA TO HYPOTHESES" title="Ask better" accent="questions."
    subtitle="Turn product signals into testable research directions. Export the events and let Claude help examine the evidence."
    aside={<button className="button-primary" onClick={()=>exportCSV(events)}><Download size={17}/> Export events (.csv)</button>}/>
  <div className="research-hero">
    <div className="research-hero-glow"/><div className="research-kicker"><Sparkles size={17}/> RESEARCH, AUGMENTED BY AI</div>
    <div className="research-hero-grid"><div><h2>AI can accelerate analysis.<br/><em>It shouldn't replace curiosity.</em></h2>
      <p>We use lightweight heuristics to surface hypotheses here. Claude can help interpret the exported evidence, while a researcher validates what the numbers cannot explain.</p></div>
      <div className="research-hero-decoration" aria-hidden="true"><BrainCircuit size={138} strokeWidth={.7}/></div></div>
    <div className="research-hero-stats"><span><Database size={16}/>{nfmt(events.length)} event records</span>
      <span><Users size={16}/>{nfmt(metrics.starts)} journeys</span><span><ShieldCheck size={16}/> No PII in analytics</span></div>
  </div>
  <div className="research-section-label"><div><span className="eyebrow-line"/> HYPOTHESES TO EXPLORE</div><span>RULE-BASED PREVIEW · NOT AI OUTPUT</span></div>
  <div className="hypotheses-grid">{hypotheses.map(h=><article className="hypothesis-card" key={h.num}>
    <span className="hypothesis-index">{h.num} / {h.tag}</span><div className="hypothesis-icon"><Lightbulb size={22}/></div>
    <h3>{h.title}</h3><p>{h.detail}</p>
    <div className="hypothesis-method"><span>HOW TO VALIDATE</span><strong>{h.method}</strong></div>
  </article>)}</div>
  <div className="claude-panel">
    <div className="claude-symbol"><BrainCircuit size={34}/></div>
    <div className="claude-content"><span className="claude-eyebrow">NEXT STEP / HUMAN + AI ANALYSIS</span>
      <h2>Bring the evidence to Claude.</h2>
      <p>Download the event CSV, copy the structured research prompt, then upload the file to Claude. Ask it to distinguish synthetic samples from observed activity and challenge the hypotheses.</p>
      <div className="claude-actions">
        <button className="button-primary" onClick={()=>exportCSV(events)}><FileSpreadsheet size={17}/> Download CSV</button>
        <button className="button-outline on-dark" onClick={copyPrompt}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?"Prompt copied":"Copy Claude prompt"}</button>
        <a className="claude-text-link" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">Open Claude <ExternalLink size={16}/></a>
      </div>
    </div>
  </div>
  <div className="research-caveat"><AlertCircle size={18}/><div><strong>Evidence before assumptions.</strong>
    <span>Reference sessions are synthetic; prototype sessions are observed demo interactions, not formal user research. The hypotheses above are generated by deterministic rules, not by an integrated AI model.</span></div></div>
  <div className="research-bottom"><div><span>TRY IT FOR YOURSELF</span><h2>Make one change.<br/>See what moves.</h2></div>
    <button className="button-primary" onClick={goJourney}>Run the prototype <ArrowRight size={17}/></button></div>
 </>;
}
export default function App(){
 const {observed,track,syncStatus}=useEventStream();
 const [page,setPage]=useState<Page>("overview");
 const [source,setSource]=useState<Source>("combined");
 const [menuOpen,setMenuOpen]=useState(false);
 const synthetic=useMemo(()=>makeSyntheticEvents(),[]);
 const allEvents=useMemo(()=>[...synthetic,...observed],[synthetic,observed]);
 const displayed=source==="combined"?allEvents:observed;
 const metrics=useMemo(()=>computeMetrics(displayed),[displayed]);
 const status=syncStatus==="connected"?"CLOUD CONNECTED":syncStatus==="connecting"?"CONNECTING":syncStatus==="error"?"LOCAL / CLOUD ERROR":"DEMO MODE";
 const changePage=(p:Page)=>{setPage(p);window.scrollTo({top:0,behavior:"instant"})};
 return <div className="app-shell">
   <a className="skip-link" href="#main-content">Skip to content</a>
   <Sidebar page={page} setPage={changePage} open={menuOpen} close={()=>setMenuOpen(false)}/>
   <div className="page-shell"><Header page={page} onMenu={()=>setMenuOpen(v=>!v)} menuOpen={menuOpen} status={status}/>
     <main id="main-content" className="main-content">
       {page==="overview"&&<Overview metrics={metrics} allEvents={observed} source={source} setSource={setSource}
         syncStatus={syncStatus} openJourney={()=>changePage("journey")} openResearch={()=>changePage("research")}/>}
       {page==="journey"&&<Journey track={track} observed={observed} goOverview={()=>changePage("overview")}/>}
       {page==="research"&&<Research metrics={metrics} events={displayed} goJourney={()=>changePage("journey")}/>}
       <footer className="main-footer"><span>© 2026 SIGNAL / PRODUCT INTELLIGENCE LAB</span><span>AN EXPERIMENT IN UX, DATA & AI <span className="footer-star">✳</span></span></footer>
     </main>
   </div>
 </div>;
}
