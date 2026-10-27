import {useEffect,useMemo,useState,type ReactNode} from "react";
import {Activity,AlertCircle,ArrowRight,ArrowUpRight,BarChart3,BrainCircuit,Check,ChevronRight,Clock3,Copy,Database,Download,ExternalLink,Globe2,LayoutDashboard,Lightbulb,Menu,MousePointerClick,Radio,RefreshCcw,ShieldCheck,Sparkles,Target,TrendingUp,Users,WalletCards,X} from "lucide-react";
import {computeMetrics,exportAggregateCSV,makeSyntheticEvents,useEventStream,SECTION_LABELS,EVENT_LABELS,type Metrics,type SummaryEvent} from "./analytics";
type Page="overview"|"journey"|"research";type Source="combined"|"observed";
const pct=(v:number)=>v.toFixed(1)+"%";const count=(v:number)=>new Intl.NumberFormat("en-US").format(v);
const timing=(v:number)=>v>0?Math.floor(v/60)+"m "+Math.round(v%60)+"s":"—";
const NOVA_URL="https://wandr-3d-travel-experience.vercel.app/";
const prompt=`Act as a UX Researcher analyzing a privacy-preserving AGGREGATED CSV from the NOVA + SIGNAL fictional banking prototype.

The file contains group-level counts and percentage rates, not row-level event logs. It does not include IP addresses, session IDs, unique visitors, personal information, or individual event timelines.

Explain the aggregate session count, app section reach, deliberate interaction rate, observed durations where present, section reach by area and top event categories. Treat synthetic and observed aggregates separately. Do not infer exact user journeys, unique people, demographic characteristics, motivation, conversions, or causality.

Write three testable UX hypotheses about discoverability, accessible motion and mobile interaction. Recommend follow-up moderated and accessibility research. Call out consent-based sampling, instrumentation error, data integrity, small sample sizes and possible fake events as limitations.

Produce a five-sentence exploratory Product Design case-study summary plus recommended next tests. Do not claim this constitutes formal participant research.`;
function Logo(){return <div className="brand-symbol" aria-hidden="true"><span/><span/><span/></div>}
function Card({children,className=""}:{children:ReactNode;className?:string}){return <section className={"surface "+className}>{children}</section>}
function Heading({title,detail,tag,icon}:{title:string;detail:string;tag?:string;icon?:ReactNode}){return <div className="section-heading"><div className="section-heading-main"><div className="section-heading-icon">{icon??<Activity size={18}/>}</div><div><h2>{title}</h2><p>{detail}</p></div></div>{tag&&<span className="section-tag">{tag}</span>}</div>}
function AppNav({page,setPage,open,close}:{page:Page;setPage:(p:Page)=>void;open:boolean;close:()=>void}){
 const links=[{key:"overview" as const,label:"Analytics overview",icon:LayoutDashboard},{key:"journey" as const,label:"NOVA experience",icon:MousePointerClick},{key:"research" as const,label:"AI research assistant",icon:BrainCircuit}];
 return <>{open&&<button className="sidebar-scrim" aria-label="Close navigation" onClick={close}/>}<aside className={"sidebar"+(open?" sidebar-open":"")}>
   <div className="sidebar-brand"><Logo/><div><strong>signal<span>.</span></strong><small>PRODUCT INTELLIGENCE</small></div></div>
   <div className="sidebar-workspace"><span className="workspace-cube"><BarChart3 size={19}/></span><div><strong>NOVA / Research lab</strong><small>Connected experience study</small></div><ChevronRight size={15}/></div>
   <span className="nav-section-title">WORKSPACE</span><nav className="side-links" aria-label="Main navigation">
   {links.map(link=><button key={link.key} className={page===link.key?"active":""} aria-current={page===link.key?"page":undefined} onClick={()=>{setPage(link.key);close()}}><link.icon size={19}/><span>{link.label}</span></button>)}</nav>
   <div className="side-divider"/><span className="nav-section-title">PRODUCT</span><div className="side-project-note"><span className="project-note-icon"><Sparkles size={17}/></span><div><strong>NOVA private banking</strong><p>Motion, accessibility, user behavior and product intelligence.</p></div></div>
   <div className="sidebar-bottom"><div className="mini-insight"><span className="mini-insight-label"><span className="mini-dot"/> RESEARCH NOTE</span><p>Good products are built on <em>understanding</em>, not assumptions.</p></div>
     <div className="sidebar-footer"><span className="avatar-tiny">N</span><div><strong>NOVA / SIGNAL</strong><small>Independent design study</small></div></div></div>
 </aside></>;
}
function Intro({label,title,accent,subtitle,action}:{label:string;title:string;accent:string;subtitle:string;action?:ReactNode}){
 return <div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/>{label}</div><h1>{title} <em>{accent}</em></h1><p>{subtitle}</p></div>{action&&<div className="page-intro-action">{action}</div>}</div>;
}
function AnimatedMetric({value}:{value:string}){
 const [display,setDisplay]=useState(value);
 useEffect(()=>{
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  const match=/^([\d,.]+)(%)?$/.exec(value);
  if(media.matches||!match){setDisplay(value);return}
  const target=Number(match[1].replaceAll(",",""));
  if(!Number.isFinite(target)){setDisplay(value);return}
  const percentage=Boolean(match[2]);
  let raf=0,start=0,active=true;
  const tick=(now:number)=>{
   if(!active)return;
   if(!start)start=now;
   const progress=Math.min(1,(now-start)/1450),eased=1-Math.pow(1-progress,3.4);
   const n=target*eased;
   setDisplay(percentage?n.toFixed(1)+"%":Math.round(n).toLocaleString("en-US"));
   if(progress<1)raf=requestAnimationFrame(tick);else setDisplay(value);
  };
  setDisplay(percentage?"0.0%":"0");
  raf=requestAnimationFrame(tick);
  const onPreference=()=>{if(media.matches){active=false;cancelAnimationFrame(raf);setDisplay(value)}};
  media.addEventListener("change",onPreference);
  return ()=>{active=false;cancelAnimationFrame(raf);media.removeEventListener("change",onPreference)};
 },[value]);
 return <><span aria-hidden="true">{display}</span><span className="sr-only">{value}</span></>;
}
function Stat({label,value,detail,icon,color}:{label:string;value:string;detail:string;icon:ReactNode;color:string}){
 return <div className={"stat-card stat-"+color}><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value" aria-label={value}><AnimatedMetric value={value}/></div><div className="stat-bottom"><span>{detail}</span></div></div>;
}
function Trend({daily}:{daily:Metrics["daily"]}){
 const x=(i:number)=>46+i*560/6,y=(v:number)=>200-Math.min(v,100)*1.68;
 const line=daily.map((d,i)=>(i?"L":"M")+x(i)+" "+y(d.rate)).join(" ");
 return <div className="trend-wrap"><div className="trend-title"><div><strong>Banking app section reach</strong><span>Seven-day cohort · starts by day</span></div><span className="legend"><i/> Reached app</span></div>
 <svg className="trend-chart" viewBox="0 0 650 258" role="img" aria-label={daily.map(d=>d.label+": "+pct(d.rate)+" reached the app").join("; ")}>
 <defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#9dd9b6" stopOpacity=".36"/><stop offset="1" stopColor="#9dd9b6" stopOpacity="0"/></linearGradient></defs>
 {[0,25,50,75,100].map(t=><g key={t}><line x1="46" x2="606" y1={y(t)} y2={y(t)} stroke="#e4eae7" strokeDasharray="5 6"/><text x="34" y={y(t)+4} textAnchor="end" fill="#788a8c" fontSize="11">{t}%</text></g>)}
 <path className="trend-area" d={line+" L "+x(6)+" 200 L "+x(0)+" 200 Z"} fill="url(#trend-fill)"/><path className="trend-line" pathLength="1" d={line} fill="none" stroke="#2d866f" strokeWidth="3.2" strokeLinecap="round"/>
 {daily.map((d,i)=><g key={d.date}><circle className="trend-point" style={{animationDelay:(.7+i*.075)+"s"}} cx={x(i)} cy={y(d.rate)} r="4" fill="#2d866f" stroke="white" strokeWidth="2"/><text x={x(i)} y="233" textAnchor="middle" fill="#7c8d88" fontSize="12">{d.label}</text></g>)}</svg></div>;
}
function Overview({metrics,topEvents,source,setSource,status,connectionIssue,openNova,openResearch}:{metrics:Metrics;topEvents:SummaryEvent[];source:Source;setSource:(s:Source)=>void;status:string;connectionIssue:string|null;openNova:()=>void;openResearch:()=>void}){
 const baseline=source==="combined";
 const [motionCycle,setMotionCycle]=useState(0);
 return <div className="signal-motion-canvas">
 <Intro label="NOVA / PRODUCT EXPERIENCE ANALYTICS" title="Understand the" accent="whole experience." subtitle="Measuring section discoverability, accessible motion preferences and fictional banking interactions."
 action={<button className="button-primary" onClick={openNova}>Explore NOVA <ArrowUpRight size={17}/></button>}/>
 <div className="notice-banner"><span className="notice-icon"><Globe2 size={19}/></span><div><strong>One product. Two perspectives.</strong><span>NOVA is the experience. SIGNAL helps us examine what happens inside it — with consent-first anonymous events.</span></div><button onClick={openNova}>View product <ArrowRight size={16}/></button></div>
 <div className="data-toolbar"><div className="data-toolbar-left"><span className="live-ring"><span/></span><span>{status==="polling"?"CLOUD / PRIVATE SUMMARY":status==="error"?"CLOUD CONNECTION ERROR":"LOCAL / SYNTHETIC PREVIEW"}</span><i/><span className="toolbar-muted">{status==="error"?"Check database permissions":status==="connecting"?"Connecting to Supabase":status==="demo"?"Cloud setup required":status==="polling"?"Privacy-safe summaries refresh every 8s":"Anonymous aggregate analytics"}</span></div>
  <div className="data-toolbar-actions"><button className="replay-motion-button" type="button" onClick={()=>setMotionCycle(value=>value+1)}><RefreshCcw size={15} aria-hidden="true"/> Replay motion</button><div className="segmented" role="group" aria-label="Data source"><button className={baseline?"selected":""} aria-pressed={baseline} onClick={()=>setSource("combined")}>Synthetic demo</button><button className={!baseline?"selected":""} aria-pressed={!baseline} onClick={()=>setSource("observed")}>Observed aggregate</button></div></div></div>
 {status==="error"&&<div className="connection-warning" role="status"><AlertCircle size={19}/><div><strong>Analytics connection needs attention</strong><p>{connectionIssue||"The database could not be reached. Check the Supabase project settings."}</p></div></div>}
 <div className="motion-display" key={source+"-"+motionCycle}>
 <div className="stats-grid">
 <Stat label="NOVA sessions" value={count(metrics.visits)} detail={baseline?"Illustrative browser sessions":"Consented browser sessions"} icon={<Users size={19}/>} color="blue"/>
 <Stat label="App section reach" value={pct(metrics.appReachRate)} detail="Sessions that reached mobile banking" icon={<WalletCards size={19}/>} color="mint"/>
 <Stat label="Interaction rate" value={pct(metrics.interactionRate)} detail="Sessions using at least one control" icon={<MousePointerClick size={19}/>} color="peach"/>
 <Stat label="Avg. observed duration" value={timing(metrics.avgTimeSeconds)} detail="Only sessions with an end event" icon={<Clock3 size={19}/>} color="purple"/>
 </div>
 <div className="analytics-grid"><Card className="trend-card"><Heading title="Reach over time" detail="How many sessions discover the NOVA banking demo?" tag="LAST 7 DAYS" icon={<TrendingUp size={18}/>}/><Trend daily={metrics.daily}/></Card>
 <Card className="funnel-card"><Heading title="Section discovery" detail="Percentage of started sessions viewing each section." tag="7 SECTIONS" icon={<Target size={18}/>}/>
 <div className="funnel-list">{metrics.sectionFunnel.map((section,i)=><div className="funnel-row" key={section.name}><div className="funnel-row-header"><span><b>{String(i+1).padStart(2,"0")}</b>{section.name}</span><strong>{count(section.count)} <small>{pct(section.rate)}</small></strong></div><div className="funnel-track"><div className={"funnel-bar funnel-"+i%4} style={{width:section.rate+"%"}}/></div></div>)}</div>
 <p className="card-footnote">Each section counts only once per session. Visits do not imply comprehension or satisfaction.</p></Card></div>
 <div className="analytics-grid bottom-grid">
 <Card className="feed-card"><Heading title="NOVA event stream" detail="Aggregate counts only. No visitor-level records exposed." tag="PRIVACY-SAFE" icon={<Radio size={18}/>}/>
 {topEvents.length===0?<div className="feed-empty"><div><Activity size={27}/></div><strong>Waiting for aggregate data</strong><p>At least five consented browser sessions are required. No individual event histories are public.</p></div>:
 <div className="event-list" aria-label="Aggregate NOVA event types">{topEvents.map((e,i)=><div className="event-item" key={e.event_name+"-"+e.section+"-"+i}><span className="event-mark"><Activity size={14}/></span><div><strong>{EVENT_LABELS[e.event_name]||"Event"}</strong><span>{e.section?SECTION_LABELS[e.section]:"All sections"} · grouped count</span></div><span className="event-count">{count(e.count)}</span></div>)}</div>}</Card>
 <Card className="insight-summary"><div className="insight-top"><span><Lightbulb size={19}/></span><span>RESEARCH SIGNAL</span></div><h2>Motion invites<br/><em>attention.</em><br/>Data invites <em>questions.</em></h2><p>{count(metrics.motionChanges)} motion-preference changes, {count(metrics.benefits)} benefit interactions and {count(metrics.transfers)} simulated transfers in the selected dataset.</p><button onClick={openResearch}>Explore research questions <ArrowUpRight size={18}/></button></Card></div>
 <div className="data-disclaimer"><ShieldCheck size={17}/><span>{baseline?"Displays 196 fictional reference sessions only.":"Only aggregated consented demo interactions; no user-level records."} {status!=="polling"?"Secure aggregate analytics require database configuration.":"Public data never contains session IDs or individual event histories."} These are experience metrics, not banking transactions or sales.</span></div>
 </div>
 </div>;
}
function Journey({goResearch}:{goResearch:()=>void}){
 return <><Intro label="EXPERIENCE LAB / NOVA PRIVATE" title="One product," accent="real interactions." subtitle="Instead of a second fictional onboarding, our research now uses the actual NOVA portfolio experience."
 action={<a className="button-primary" href={NOVA_URL} target="_blank" rel="noopener noreferrer">Open NOVA <ExternalLink size={17}/></a>}/>
 <div className="experiment-warning"><ShieldCheck size={17}/><span>Consent required. NOVA does not send private balances, names, email addresses or transfer amounts to analytics.</span></div>
 <div className="nova-connection-layout">
 <div className="journey-explainer"><div className="experiment-no">RESEARCH PRODUCT <span> / </span> NOVA</div><h2>From meaningful<br/><em>interactions.</em></h2><p>Explore the NOVA website and observe which experiences are discoverable, engaging and accessible.</p>
 <div className="how-it-works"><div><span>01</span><div><strong>Explore</strong><small>Scroll through cinematic chapters and interactive product UI.</small></div></div>
 <div><span>02</span><div><strong>Measure</strong><small>Anonymous events describe sections, clicks and motion settings.</small></div></div>
 <div><span>03</span><div><strong>Investigate</strong><small>Analyze patterns and validate hypotheses with UX research.</small></div></div></div>
 <div className="session-widget"><div className="session-head"><Database size={18}/><strong>MEASUREMENT INTEGRATION</strong></div><div className="session-tags"><span>NO PII</span><span>OPT-IN</span><span>NOT A REAL BANK</span></div></div></div>
 <div className="nova-product-preview"><div className="nova-preview-stars" aria-hidden="true"/><div className="nova-preview-top"><span>nova</span><small>PRIVATE BANKING CONCEPT</small></div><span className="nova-preview-kicker">THE ART OF MORE.</span><h2>EXPLORE<br/><em>THE NOVA.</em></h2><p>Cinematic chapters. A fictional mobile banking prototype. Accessibility-first motion.</p><a href={NOVA_URL} target="_blank" rel="noopener noreferrer">LAUNCH THE EXPERIENCE <ArrowUpRight size={20}/></a><small className="nova-preview-foot">EXTERNAL PRODUCT / opens new tab</small></div>
 </div><div className="research-bottom"><div><span>AFTER YOU EXPLORE</span><h2>See what the<br/>signals reveal.</h2></div><button className="button-primary" onClick={goResearch}>Research with Claude <ArrowRight size={17}/></button></div></>;
}
function Research({metrics,topEvents,source}:{metrics:Metrics;topEvents:SummaryEvent[];source:Source}){
 const [copied,setCopied]=useState(false);
 const copy=async()=>{try{await navigator.clipboard.writeText(prompt);setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{setCopied(false)}};
 const scenarios=[
 {index:"01",label:"DISCOVERABILITY",title:"Does scroll-directed storytelling lead people to the banking app?",detail:pct(metrics.appReachRate)+" of started sessions reached that section. Reach alone cannot establish whether people understood the offer.",method:"Usability walkthroughs and navigation task completion."},
 {index:"02",label:"ACCESSIBLE MOTION",title:"Does the motion control improve comfort without hiding information?",detail:count(metrics.motionChanges)+" motion-preference changes in this dataset. This event does not reveal disability, preference direction or satisfaction.",method:"VoiceOver, keyboard and reduced-motion user testing."},
 {index:"03",label:"INTERACTIVE DEMO",title:"Which banking interactions are discoverable and meaningful?",detail:count(metrics.transfers)+" fictional transfers and "+count(metrics.benefits)+" benefits explored. Neither metric reflects real financial behavior.",method:"Moderated interviews plus task-based observation."}
 ];
 return <><Intro label="AI + UX RESEARCH / NOVA EXPERIMENT" title="Ask better" accent="questions." subtitle="Use consented analytics to frame hypotheses — and Claude to assist interpretation, not replace a researcher."
 action={<button className="button-primary" onClick={()=>exportAggregateCSV(metrics,topEvents,source==="observed"?"observed":"synthetic")}><Download size={17}/> Export events (.csv)</button>}/>
 <div className="research-hero"><div className="research-hero-glow"/><div className="research-kicker"><Sparkles size={16}/> RESEARCH, AUGMENTED BY AI</div><div className="research-hero-grid"><div><h2>AI can accelerate analysis.<br/><em>It shouldn't replace curiosity.</em></h2><p>Explore consented aggregate metrics to study accessibility and discoverability. Session-level data remains private. Validate hypotheses through qualitative research.</p></div><div className="research-hero-decoration" aria-hidden="true"><BrainCircuit size={135} strokeWidth={.8}/></div></div><div className="research-hero-stats"><span><Database size={16}/>{count(metrics.eventCount)} events</span><span><Users size={16}/>{count(metrics.visits)} sessions</span><span><ShieldCheck size={16}/> Anonymous + consent-based</span></div></div>
 <div className="research-section-label"><div><span className="eyebrow-line"/> QUESTIONS WORTH EXPLORING</div><span>RULE-BASED PREVIEW · NOT CLAUDE OUTPUT</span></div>
 <div className="hypotheses-grid">{scenarios.map(h=><article className="hypothesis-card" key={h.index}><span className="hypothesis-index">{h.index} / {h.label}</span><div className="hypothesis-icon"><Lightbulb size={22}/></div><h3>{h.title}</h3><p>{h.detail}</p><div className="hypothesis-method"><span>HOW TO VALIDATE</span><strong>{h.method}</strong></div></article>)}</div>
 <div className="claude-panel"><div className="claude-symbol"><BrainCircuit size={34}/></div><div className="claude-content"><span className="claude-eyebrow">NEXT STEP / HUMAN + AI RESEARCH</span><h2>Bring NOVA events to Claude.</h2><p>Export privacy-safe aggregate metrics, copy the prompt, and upload the CSV to Claude. The file excludes individual identifiers and precise event timestamps.</p><div className="claude-actions"><button className="button-primary" onClick={()=>exportAggregateCSV(metrics,topEvents,source==="observed"?"observed":"synthetic")}><Download size={16}/> Download CSV</button><button className="button-outline on-dark" onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?"Prompt copied":"Copy Claude prompt"}</button><a href="https://claude.ai/new" className="claude-text-link" target="_blank" rel="noopener noreferrer">Open Claude <ExternalLink size={16}/></a></div></div></div>
 <div className="research-caveat"><ShieldCheck size={18}/><div><strong>Correlation is not causation.</strong><span>Simulated visits are illustrative, not recruited participants. Observed metrics are aggregates, with no individual trace available for public export. The hypotheses shown are deterministic templates, not live AI analysis.</span></div></div>
 </>;
}
export default function App(){
 const [page,setPage]=useState<Page>("overview"),[menuOpen,setMenuOpen]=useState(false),[source,setSource]=useState<Source>("combined");
 const {summary,topEvents,syncStatus,connectionIssue}=useEventStream(),synthetic=useMemo(()=>makeSyntheticEvents(),[]);
 const demoMetrics=useMemo(()=>computeMetrics(synthetic),[synthetic]);
 const metrics=source==="observed"?(summary||computeMetrics([])):demoMetrics;
 const displayedEvents=source==="observed"?topEvents:[];
 const change=(p:Page)=>{setPage(p);window.scrollTo({top:0,behavior:"instant"})},goNova=()=>window.open(NOVA_URL,"_blank","noopener,noreferrer");
 return <div className="app-shell"><a href="#main-content" className="skip-link">Skip to content</a><AppNav page={page} setPage={change} open={menuOpen} close={()=>setMenuOpen(false)}/>
 <div className="page-shell"><header className="topbar"><div className="topbar-location"><span>WORKSPACE</span><ChevronRight size={13}/><strong>{page==="overview"?"Analytics overview":page==="journey"?"NOVA experience":"AI research"}</strong></div><div className="topbar-right"><span className="project-status"><span className="status-pulse"/> {syncStatus==="polling"?"PRIVACY-SAFE CLOUD":syncStatus==="demo"?"DEMO MODE":syncStatus==="connecting"?"CONNECTING":"CLOUD UNAVAILABLE"}</span><div className="avatar-bubble">N</div><button className="icon-button mobile-menu-button" aria-label={menuOpen?"Close navigation":"Open navigation"} aria-expanded={menuOpen} onClick={()=>setMenuOpen(x=>!x)}>{menuOpen?<X size={20}/>:<Menu size={20}/>}</button></div></header>
 <main id="main-content" className="main-content">{page==="overview"?<Overview metrics={metrics} topEvents={displayedEvents} source={source} setSource={setSource} status={syncStatus} connectionIssue={connectionIssue} openNova={goNova} openResearch={()=>change("research")}/>:page==="journey"?<Journey goResearch={()=>change("research")}/>:<Research metrics={metrics} topEvents={displayedEvents} source={source}/>}
 <footer className="main-footer"><span>© 2026 SIGNAL / NOVA RESEARCH LAB</span><span>UX · PRODUCT ANALYTICS · AI <span className="footer-star">✳</span></span><p className="project-disclaimer">This is an independent educational design experiment. NOVA is a fictional banking concept. No real financial transactions are performed.</p></footer></main></div></div>;
}
