
import {useCallback,useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";

export type Step = "welcome"|"profile"|"goals"|"review"|"complete";
export type EventName = "flow_started"|"step_viewed"|"step_completed"|"validation_error"|"flow_completed"|"flow_abandoned";
export type UXEvent = {
  id:string; session_id:string; event_name:EventName; step:Step;
  duration_ms:number|null; created_at:string; source:"observed"|"synthetic";
};
type RawEvent = Omit<UXEvent,"source">;

const KEY="signal:events:v1";
const CHANNEL="signal:ux-events";
const supabaseUrl=import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnon=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const cloudConfigured=Boolean(supabaseUrl&&supabaseAnon);
const client:SupabaseClient|null=cloudConfigured?createClient(supabaseUrl!,supabaseAnon!,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  realtime:{params:{eventsPerSecond:10}}
}):null;

function uuid(){return typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():"demo-"+Date.now()+"-"+Math.random().toString(36).slice(2)}
function storageEvents():UXEvent[]{
  try{
    const value=JSON.parse(localStorage.getItem(KEY)||"[]");
    if(!Array.isArray(value))return [];
    return value.filter(v=>v&&typeof v.id==="string"&&typeof v.event_name==="string"&&typeof v.created_at==="string").slice(-450);
  }catch{return []}
}
function mergeUnique(current:UXEvent[],incoming:UXEvent[]):UXEvent[]{
  const map=new Map<string,UXEvent>();
  for(const item of [...current,...incoming])map.set(item.id,item);
  return [...map.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)).slice(-500);
}

export function useEventStream(){
  const [observed,setObserved]=useState<UXEvent[]>(storageEvents);
  const [syncStatus,setSyncStatus]=useState<"demo"|"connecting"|"connected"|"error">(cloudConfigured?"connecting":"demo");

  useEffect(()=>{
    const bc=typeof BroadcastChannel!=="undefined"?new BroadcastChannel(CHANNEL):null;
    if(bc)bc.onmessage=(message:MessageEvent<UXEvent>)=>{
      if(message.data?.id)setObserved(current=>mergeUnique(current,[message.data]));
    };
    function onStorage(event:StorageEvent){if(event.key===KEY)setObserved(current=>mergeUnique(current,storageEvents()))}
    window.addEventListener("storage",onStorage);
    return ()=>{bc?.close();window.removeEventListener("storage",onStorage)};
  },[]);

  useEffect(()=>{
    try{localStorage.setItem(KEY,JSON.stringify(observed))}catch{/* storage may be disabled */}
  },[observed]);

  useEffect(()=>{
    if(!client)return;
    let active=true;
    void client.from("ux_events").select("*").order("created_at",{ascending:false}).limit(500)
      .then(({data,error})=>{
        if(!active)return;
        if(error){console.warn("Supabase history:",error.message);setSyncStatus("error");return}
        if(data)setObserved(previous=>mergeUnique(previous,(data as RawEvent[]).map(item=>({...item,source:"observed"}))));
      });
    const subscription=client.channel("signal-events")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"ux_events"},payload=>{
        if(!active)return;
        const item=payload.new as RawEvent;
        if(item?.id)setObserved(previous=>mergeUnique(previous,[{...item,source:"observed"}]));
      })
      .subscribe(status=>{if(active)setSyncStatus(status==="SUBSCRIBED"?"connected":status==="CHANNEL_ERROR"||status==="TIMED_OUT"?"error":"connecting")});
    return ()=>{active=false;void client.removeChannel(subscription)};
  },[]);

  const track=useCallback((sessionId:string,eventName:EventName,step:Step,durationMs:number|null=null)=>{
    const event:UXEvent={id:uuid(),session_id:sessionId,event_name:eventName,step,
      duration_ms:durationMs===null?null:Math.max(0,Math.min(3600000,Math.round(durationMs))),
      created_at:new Date().toISOString(),source:"observed"};
    setObserved(current=>mergeUnique(current,[event]));
    // BroadcastChannel shares activity across open tabs even without Supabase.
    if(typeof BroadcastChannel!=="undefined"){const bc=new BroadcastChannel(CHANNEL);bc.postMessage(event);bc.close()}
    if(client){
      const {source:discarded,...row}=event;
      void discarded;
      void client.from("ux_events").insert(row).then(({error})=>{
        if(error){console.warn("Supabase insert:",error.message);setSyncStatus("error")}
      });
    }
    return event;
  },[]);

  const resetLocal=useCallback(()=>{
    setObserved([]);
    try{localStorage.removeItem(KEY)}catch{/* storage disabled */}
  },[]);

  return {observed,track,syncStatus,resetLocal};
}

// Fixed-seed, illustrative reference sessions. These are NOT actual users.
export function makeSyntheticEvents():UXEvent[]{
  let value=829731;
  const rand=()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296};
  const data:UXEvent[]=[];
  const now=new Date();
  const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let seq=0;
  const push=(session:string,name:EventName,step:Step,date:Date,duration:number|null=null)=>{
    data.push({id:"synthetic-"+(++seq),session_id:session,event_name:name,step,duration_ms:duration,
      created_at:date.toISOString(),source:"synthetic"});
  };
  for(let i=0;i<196;i++){
    const day=Math.floor(i/28); // 28 simulated starts per day, for seven days
    const start=new Date(midnight.getTime()-(6-day)*86400000+(8+rand()*12)*3600000+rand()*300000);
    const session="synthetic-session-"+i;
    const time=(n:number)=>new Date(start.getTime()+n*1000);
    push(session,"flow_started","welcome",start);
    push(session,"step_viewed","profile",time(2));
    const errorOnProfile=rand()<.26;
    if(errorOnProfile)push(session,"validation_error","profile",time(16));
    const firstDrop=rand()<.13+(day<2?.07:0);
    if(firstDrop){push(session,"flow_abandoned","profile",time(22));continue}
    push(session,"step_completed","profile",time(40+rand()*38));
    push(session,"step_viewed","goals",time(85));
    if(rand()<.18)push(session,"validation_error","goals",time(98));
    if(rand()<.18+(day<2?.06:0)){push(session,"flow_abandoned","goals",time(112));continue}
    push(session,"step_completed","goals",time(118+rand()*38));
    push(session,"step_viewed","review",time(166));
    if(rand()<.08){push(session,"flow_abandoned","review",time(183));continue}
    const seconds=Math.round(192+rand()*145);
    push(session,"flow_completed","complete",time(seconds),seconds*1000);
  }
  return data;
}

export type Metrics={
  starts:number;completions:number;completionRate:number;abandonmentRate:number;
  errorCount:number;errorRate:number;avgTimeSeconds:number;
  funnel:{step:string;count:number;percent:number}[];
  daily:{date:string;label:string;started:number;completed:number;rate:number}[];
  friction:{step:string;errors:number;abandons:number}[];
  observedSessions:number;syntheticSessions:number;
};

export function computeMetrics(events:UXEvent[]):Metrics{
  const sessions=new Map<string,{start:boolean;profile:boolean;goals:boolean;complete:boolean;abandon:boolean;duration:number|null}>();
  const friction:{[key:string]:{errors:number;abandons:number}}={
    profile:{errors:0,abandons:0},goals:{errors:0,abandons:0},review:{errors:0,abandons:0}
  };
  const daily=new Map<string,{started:number;completed:number}>();
  const uniqueObserved=new Set<string>(),uniqueSynthetic=new Set<string>();
  let errors=0;
  for(const ev of events){
    if(ev.source==="observed")uniqueObserved.add(ev.session_id);else uniqueSynthetic.add(ev.session_id);
    let s=sessions.get(ev.session_id);
    if(!s){s={start:false,profile:false,goals:false,complete:false,abandon:false,duration:null};sessions.set(ev.session_id,s)}
    const date=ev.created_at.slice(0,10);
    const d=daily.get(date)||{started:0,completed:0};
    switch(ev.event_name){
      case "flow_started":s.start=true;d.started++;break;
      case "step_completed":if(ev.step==="profile")s.profile=true;if(ev.step==="goals")s.goals=true;break;
      case "flow_completed":s.complete=true;s.duration=ev.duration_ms;d.completed++;break;
      case "flow_abandoned":s.abandon=true;if(friction[ev.step])friction[ev.step].abandons++;break;
      case "validation_error":errors++;if(friction[ev.step])friction[ev.step].errors++;break;
    }
    daily.set(date,d);
  }
  const values=[...sessions.values()].filter(s=>s.start);
  const starts=values.length,completions=values.filter(s=>s.complete).length;
  const abandoned=values.filter(s=>s.abandon&&!s.complete).length;
  const durations=values.filter(s=>s.complete&&s.duration!==null).map(s=>s.duration!/1000);
  const safeRatio=(n:number,d:number)=>d?100*n/d:0;
  const now=new Date(),midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const dailyRows=Array.from({length:7},(_,index)=>{
    const day=new Date(midnight.getTime()-(6-index)*86400000);
    const key=day.toISOString().slice(0,10);
    const d=daily.get(key)||{started:0,completed:0};
    return {date:key,label:day.toLocaleDateString("en-US",{weekday:"short"}),...d,rate:safeRatio(d.completed,d.started)};
  });
  return {
    starts,completions,completionRate:safeRatio(completions,starts),abandonmentRate:safeRatio(abandoned,starts),
    errorCount:errors,errorRate:safeRatio(errors,starts),
    avgTimeSeconds:durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:0,
    funnel:[
      {step:"Started journey",count:starts,percent:safeRatio(starts,starts)},
      {step:"Profile completed",count:values.filter(s=>s.profile).length,percent:safeRatio(values.filter(s=>s.profile).length,starts)},
      {step:"Goals selected",count:values.filter(s=>s.goals).length,percent:safeRatio(values.filter(s=>s.goals).length,starts)},
      {step:"Account created",count:completions,percent:safeRatio(completions,starts)}
    ],
    daily:dailyRows,
    friction:Object.entries(friction).map(([step,data])=>({step:step[0].toUpperCase()+step.slice(1),...data})),
    observedSessions:uniqueObserved.size,syntheticSessions:uniqueSynthetic.size
  };
}

export function exportCSV(events:UXEvent[]){
  const fields=["id","session_id","event_name","step","duration_ms","created_at","source"] as const;
  const values=[fields.join(","),...events.map(row=>fields.map(field=>{
    const cell=String(row[field]??"");
    return '"'+cell.replaceAll('"','""')+'"';
  }).join(","))].join("\n");
  const url=URL.createObjectURL(new Blob([values],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="signal-ux-events.csv";document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
