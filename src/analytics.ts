import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
export type NovaSection="hero"|"experience"|"security"|"wealth"|"world"|"benefits"|"app"|"footer";
export type EventName="visit_started"|"section_viewed"|"nav_clicked"|"modal_opened"|"modal_route_selected"|"benefit_opened"|"motion_preference_changed"|"app_tab_opened"|"demo_transfer_completed"|"demo_topup"|"card_status_changed"|"visit_ended";
export type UXEvent={id:string;session_id:string;event_name:EventName;section:NovaSection|null;device_type:"mobile"|"tablet"|"desktop";duration_ms:number|null;created_at:string;source:"observed"|"synthetic"};
const url=import.meta.env.VITE_SUPABASE_URL?.trim(),key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const cloudConfigured=Boolean(url&&key);
const db=cloudConfigured?createClient(url!,key!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
type Raw=Omit<UXEvent,"source">;
export type Status="demo"|"connecting"|"connected"|"error";
export function useEventStream(){
 const [observed,setObserved]=useState<UXEvent[]>([]);
 const [syncStatus,setSyncStatus]=useState<Status>(db?"connecting":"demo");
 useEffect(()=>{
  if(!db)return;
  let active=true;
  const merge=(incoming:UXEvent[])=>setObserved(prev=>{
   const map=new Map([...prev,...incoming].map(x=>[x.id,x] as const));
   return [...map.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)).slice(-1500);
  });
  void db.from("nova_events").select("*").order("created_at",{ascending:false}).limit(1000).then(({data,error})=>{
    if(!active)return;
    if(error){setSyncStatus("error");console.warn(error.message);return}
    merge(((data||[]) as Raw[]).map(x=>({...x,source:"observed"})));
  });
  const channel=db.channel("nova-signal-live").on("postgres_changes",{event:"INSERT",schema:"public",table:"nova_events"},payload=>{
    if(active&&payload.new?.id)merge([{...(payload.new as Raw),source:"observed"}]);
  }).subscribe(state=>{if(active)setSyncStatus(state==="SUBSCRIBED"?"connected":state==="CHANNEL_ERROR"||state==="TIMED_OUT"?"error":"connecting")});
  return ()=>{active=false;void db.removeChannel(channel)};
 },[]);
 return {observed,syncStatus};
}
const SECTIONS:NovaSection[]=["hero","experience","security","wealth","world","benefits","app"];
export const SECTION_LABELS:Record<NovaSection,string>={hero:"Introduction",experience:"Signature card",security:"Security",wealth:"Wealth",world:"Worldwide",benefits:"Benefits",app:"Banking app",footer:"Footer"};
export const EVENT_LABELS:Record<EventName,string>={
 visit_started:"Session started",section_viewed:"Section viewed",nav_clicked:"Navigation clicked",modal_opened:"Experience opened",modal_route_selected:"Destination selected",benefit_opened:"Benefit expanded",
 motion_preference_changed:"Motion preference changed",app_tab_opened:"App tab opened",demo_transfer_completed:"Demo transfer completed",demo_topup:"Demo balance added",card_status_changed:"Demo card status changed",visit_ended:"Session ended"
};
// Deterministic illustrative traffic, explicitly NOT visitors.
export function makeSyntheticEvents():UXEvent[]{
 let seed=194713;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const result:UXEvent[]=[];const midnight=new Date();midnight.setHours(0,0,0,0);
 let serial=0;
 const push=(session:string,name:EventName,section:NovaSection|null,when:number,device:UXEvent["device_type"],duration:number|null=null)=>{
  result.push({id:"reference-"+(++serial),session_id:session,event_name:name,section,device_type:device,duration_ms:duration,created_at:new Date(when).toISOString(),source:"synthetic"});
 };
 for(let i=0;i<196;i++){
  const day=Math.floor(i/28),session="reference-session-"+i,device=random()<.51?"mobile":random()<.42?"tablet":"desktop";
  const start=midnight.getTime()-(6-day)*86400000+8*3600000+random()*12*3600000;
  const at=(seconds:number)=>start+seconds*1000;
  push(session,"visit_started","hero",at(0),device);push(session,"section_viewed","hero",at(1),device);
  let offset=12;
  for(let s=1;s<SECTIONS.length;s++){
   if(random()>(s===1?.88:s===2?.82:s===3?.79:s===4?.81:s===5?.84:.78))break;
   const section=SECTIONS[s];push(session,"section_viewed",section,at(offset),device);offset+=22+random()*34;
   if(s===5&&random()<.41)push(session,"benefit_opened","benefits",at(offset-5),device);
   if(s===6&&random()<.36)push(session,"app_tab_opened","app",at(offset-9),device);
   if(s===6&&random()<.19)push(session,"demo_transfer_completed","app",at(offset-3),device);
  }
  if(random()<.32)push(session,"modal_opened","hero",at(9),device);
  if(random()<.13)push(session,"motion_preference_changed","hero",at(13),device);
  push(session,"visit_ended",null,at(offset+15),device,Math.round((offset+15)*1000));
 }
 return result;
}
export type Metrics={visits:number;appReach:number;appReachRate:number;interactionRate:number;avgTimeSeconds:number;motionChanges:number;
 transfers:number;benefits:number;sectionFunnel:{name:string;count:number;rate:number}[];daily:{date:string;label:string;started:number;app:number;rate:number}[];
 devices:{name:string;count:number;rate:number}[];sessionSources:{observed:number;synthetic:number};eventCount:number;};
export function computeMetrics(events:UXEvent[]):Metrics{
 const sessions=new Map<string,{start:boolean;sections:Set<NovaSection>;interactions:number;duration:number|null;device:string;source:string}>();
 const daily=new Map<string,{started:number;app:number}>();
 let motionChanges=0,transfers=0,benefits=0;
 for(const e of events){
  let s=sessions.get(e.session_id);
  if(!s){s={start:false,sections:new Set(),interactions:0,duration:null,device:e.device_type,source:e.source};sessions.set(e.session_id,s)}
  if(e.event_name==="visit_started"){s.start=true}
  if(e.event_name==="section_viewed"&&e.section)s.sections.add(e.section);
  if(e.event_name==="visit_ended"&&e.duration_ms!==null)s.duration=e.duration_ms;
  if(["nav_clicked","modal_opened","modal_route_selected","benefit_opened","motion_preference_changed","app_tab_opened","demo_transfer_completed","demo_topup","card_status_changed"].includes(e.event_name))s.interactions++;
  if(e.event_name==="motion_preference_changed")motionChanges++;
  if(e.event_name==="demo_transfer_completed")transfers++;
  if(e.event_name==="benefit_opened")benefits++;
 }
 const rows=[...sessions.values()].filter(s=>s.start);const visits=rows.length,appReach=rows.filter(s=>s.sections.has("app")).length;
 const ratio=(a:number,b:number)=>b?100*a/b:0;
 const durations=rows.filter(s=>s.duration!==null).map(s=>s.duration!/1000);
 const deviceCounts=["mobile","tablet","desktop"].map(name=>({name,count:rows.filter(s=>s.device===name).length,rate:ratio(rows.filter(s=>s.device===name).length,visits)}));
 const startBySession=new Map<string,string>();
 const appBySession=new Set<string>();
 for(const e of events){
  if(e.event_name==="visit_started")startBySession.set(e.session_id,e.created_at.slice(0,10));
  if(e.event_name==="section_viewed"&&e.section==="app")appBySession.add(e.session_id);
 }
 for(const [session,date] of startBySession){const d=daily.get(date)||{started:0,app:0};d.started++;if(appBySession.has(session))d.app++;daily.set(date,d)}
 const midnight=new Date();midnight.setHours(0,0,0,0);
 const lastWeek=Array.from({length:7},(_,i)=>{const date=new Date(midnight.getTime()-(6-i)*86400000);const key=date.toISOString().slice(0,10);const d=daily.get(key)||{started:0,app:0};
 return {date:key,label:date.toLocaleDateString("en-US",{weekday:"short"}),...d,rate:ratio(d.app,d.started)}});
 return {visits,appReach,appReachRate:ratio(appReach,visits),interactionRate:ratio(rows.filter(s=>s.interactions>0).length,visits),avgTimeSeconds:durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:0,motionChanges,transfers,benefits,
 sectionFunnel:SECTIONS.map(name=>({name:SECTION_LABELS[name],count:rows.filter(s=>s.sections.has(name)).length,rate:ratio(rows.filter(s=>s.sections.has(name)).length,visits)})),
 daily:lastWeek,devices:deviceCounts,sessionSources:{observed:rows.filter(s=>s.source==="observed").length,synthetic:rows.filter(s=>s.source==="synthetic").length},eventCount:events.length};
}
export function exportCSV(events:UXEvent[]){
 const fields=["id","session_id","event_name","section","device_type","duration_ms","created_at","source"] as const;
 const rows=[fields.join(","),...events.map(e=>fields.map(k=>'"'+String(e[k]??"").replaceAll('"','""')+'"').join(","))].join("\n");
 const uri=URL.createObjectURL(new Blob([rows],{type:"text/csv;charset=utf-8"}));
 const link=document.createElement("a");link.href=uri;link.download="signal-nova-events.csv";document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(uri),1000);
}
