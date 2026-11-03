"use strict";
(()=>{
const STORE="paidpace.vault.v1",VERSION=1,ENC=new TextEncoder(),DEC=new TextDecoder(),MAX=500;
const el=id=>document.getElementById(id),gate=el("gate"),workspace=el("workspace"),gateNote=el("gateFeedback"),appNote=el("appFeedback");
let mode=null,pass=null,items=[],draftId=null,editId=null;
function dateShift(delta){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+delta);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function dateOK(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+"T12:00:00");return !Number.isNaN(d.valueOf())&&[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")===s}
function money(c){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c/100)}
function note(node,s,error){node.textContent=s;node.classList.toggle("error",!!error)}
function byteString(buffer){let s="";for(const n of new Uint8Array(buffer))s+=String.fromCharCode(n);return btoa(s)}
function fromB64(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
function validEnv(v){return v&&v.v===VERSION&&typeof v.salt==="string"&&v.salt.length>=20&&typeof v.iv==="string"&&v.iv.length>=15&&typeof v.data==="string"&&v.data.length>25}
function getEnv(){const v=localStorage.getItem(STORE);if(!v)return null;const e=JSON.parse(v);if(!validEnv(e))throw Error("Stored workspace is not valid.");return e}
async function keyFor(password,salt){const base=await crypto.subtle.importKey("raw",ENC.encode(password),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:240000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function encrypt(data,password,oldSalt){const salt=oldSalt?fromB64(oldSalt):crypto.getRandomValues(new Uint8Array(16));const iv=crypto.getRandomValues(new Uint8Array(12));const key=await keyFor(password,salt);const plain=ENC.encode(JSON.stringify({version:1,records:data}));const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain);return {v:VERSION,salt:byteString(salt),iv:byteString(iv),data:byteString(encrypted)}}
function validate(r){if(!r||typeof r!=="object")throw Error("Invalid invoice.");const x={id:String(r.id||""),reference:String(r.reference||""),client:String(r.client||""),email:String(r.email||""),amount:Number(r.amount),due:String(r.due||""),status:String(r.status||""),notes:String(r.notes||"")};if(!/^[\w-]{1,80}$/.test(x.id)||!x.reference.trim()||x.reference.length>80||!x.client.trim()||x.client.length>100||x.email.length>150||x.notes.length>500||!Number.isSafeInteger(x.amount)||x.amount<1||x.amount>10000000000||!dateOK(x.due)||!["paid","unpaid"].includes(x.status))throw Error("Invalid invoice fields.");return x}
async function decrypt(env,password){let plain;try{const key=await keyFor(password,fromB64(env.salt));plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromB64(env.iv)},key,fromB64(env.data))}catch(e){throw Error("Wrong passphrase or damaged backup.")}const value=JSON.parse(DEC.decode(plain));if(!value||value.version!==1||!Array.isArray(value.records)||value.records.length>MAX)throw Error("Invalid workspace contents.");return value.records.map(validate)}
async function save(){if(mode!=="private")return;const old=getEnv();const env=await encrypt(items,pass,old?old.salt:null);localStorage.setItem(STORE,JSON.stringify(env))}
function sample(){return [
{id:"sample-1",reference:"DEMO-101",client:"Sample Garden Company",email:"",amount:42000,due:dateShift(-12),status:"unpaid",notes:"Fictional sample"},
{id:"sample-2",reference:"DEMO-102",client:"Example Studio",email:"",amount:18500,due:dateShift(4),status:"unpaid",notes:"Fictional sample"},
{id:"sample-3",reference:"DEMO-103",client:"Sample Retail LLC",email:"",amount:97000,due:dateShift(-3),status:"paid",notes:"Fictional sample"}]}
function open(modeValue){mode=modeValue;gate.hidden=true;workspace.hidden=false;el("modeTitle").textContent=mode==="demo"?"Fictional demo invoices":"Your encrypted workspace";el("modeDesc").textContent=mode==="demo"?"Sample entries are fictional and do not persist.":"Records are encrypted in this browser. Keep a backup and your passphrase.";el("backupBtn").disabled=mode!=="private";el("restoreFile").disabled=mode!=="private";el("eraseBtn").hidden=mode!=="private";draw()}
function lock(){pass=null;mode=null;items=[];draftId=null;editId=null;gate.hidden=false;workspace.hidden=true;el("passphrase").value="";el("confirmPass").value="";note(appNote,"");note(gateNote,"")}
el("demoBtn").addEventListener("click",()=>{items=sample();pass=null;open("demo")});
el("createVault").addEventListener("click",async()=>{
const secret=el("passphrase").value;note(gateNote,"");
if(secret.length<10){note(gateNote,"Use at least 10 characters in your passphrase.",true);return}
if(secret!==el("confirmPass").value){note(gateNote,"Passphrases do not match.",true);return}
if(!crypto.subtle){note(gateNote,"Encrypted local storage is unavailable in this browser.",true);return}
try{if(getEnv()){note(gateNote,"This browser already has a workspace. Unlock it instead.",true);return}}catch(e){note(gateNote,e.message,true);return}
el("createVault").disabled=true;try{const env=await encrypt([],secret);localStorage.setItem(STORE,JSON.stringify(env));pass=secret;items=[];open("private");note(appNote,"Workspace created. Download a backup and remember your passphrase.")}catch(e){note(gateNote,"Unable to create local workspace.",true)}finally{el("createVault").disabled=false;el("passphrase").value="";el("confirmPass").value=""}
});
el("unlockVault").addEventListener("click",async()=>{
let env;try{env=getEnv()}catch(e){note(gateNote,e.message,true);return}
if(!env){note(gateNote,"There is no private workspace saved here. Create one instead.",true);return}
const secret=el("passphrase").value;if(!secret){note(gateNote,"Enter your workspace passphrase.",true);return}
el("unlockVault").disabled=true;try{items=await decrypt(env,secret);pass=secret;open("private");note(appNote,"Workspace unlocked.")}catch(e){note(gateNote,e.message,true)}finally{el("unlockVault").disabled=false;el("passphrase").value="";el("confirmPass").value=""}
});
el("lockBtn").addEventListener("click",lock);
function draw(){
const today=dateShift(0),soon=dateShift(7),unpaid=items.filter(r=>r.status==="unpaid");
el("unpaidCount").textContent=unpaid.length;el("totalUnpaid").textContent=money(unpaid.reduce((v,r)=>v+r.amount,0));
el("overdueCount").textContent=unpaid.filter(r=>r.due<today).length;
el("soonCount").textContent=unpaid.filter(r=>r.due>=today&&r.due<=soon).length;
const filter=el("filter").value,search=el("search").value.trim().toLowerCase();
const visible=items.filter(r=>{
if(search&&!(r.reference+" "+r.client+" "+r.email).toLowerCase().includes(search))return false;
if(filter==="overdue")return r.status==="unpaid"&&r.due<today;
return filter==="all"||r.status===filter
}).sort((a,b)=>a.due.localeCompare(b.due));
const list=el("invoiceList");list.replaceChildren();el("emptyList").hidden=visible.length>0;
for(const r of visible){
const card=document.createElement("div");card.className="invoice-item";
const body=document.createElement("div");body.className="invoice-main";
const heading=document.createElement("strong");heading.textContent=r.client+" · "+money(r.amount);
const chip=document.createElement("span");chip.className="state "+(r.status==="paid"?"paid":r.due<today?"overdue":"");
chip.textContent=r.status==="paid"?"Paid":r.due<today?"Overdue":r.due===today?"Due today":"Unpaid";
const meta=document.createElement("p");meta.className="invoice-meta";meta.textContent=r.reference+" · Due "+r.due+(r.notes?" · "+r.notes:"");
body.append(heading,chip,meta);
const actions=document.createElement("div");actions.className="invoice-actions";
function action(label,fn,style){const b=document.createElement("button");b.type="button";b.className="button "+(style||"secondary");b.textContent=label;b.addEventListener("click",fn);return b}
actions.append(
action(r.status==="paid"?"Mark unpaid":"Mark paid",async()=>{const previous=r.status;r.status=previous==="paid"?"unpaid":"paid";try{await save();draw();note(appNote,"Status updated.")}catch(e){r.status=previous;draw();note(appNote,"Unable to save status.",true)}}),
action("Edit",()=>showEditor(r)),
action("Draft",()=>showDraft(r.id)),
action("Delete",async()=>{if(!confirm("Delete invoice "+r.reference+"?"))return;const before=items;items=items.filter(x=>x.id!==r.id);try{await save();draw();note(appNote,"Invoice deleted.")}catch(e){items=before;draw();note(appNote,"Unable to save deletion.",true)}},"subtle"));
card.append(body,actions);list.append(card)
}}
el("search").addEventListener("input",draw);el("filter").addEventListener("change",draw);
function showEditor(r){el("editor").hidden=false;el("editorTitle").textContent=r?"Edit invoice":"Add invoice";el("invoiceForm").reset();editId=r?r.id:null;
if(r){for(const field of ["reference","client","email","due","status","notes"])el("invoiceForm").elements.namedItem(field).value=r[field];el("amount").value=(r.amount/100).toFixed(2)}
el("ref").focus()}
el("addBtn").addEventListener("click",()=>{if(items.length>=MAX){note(appNote,"Limit reached: 500 pilot invoices.",true);return}showEditor(null)});
el("cancelBtn").addEventListener("click",()=>{el("editor").hidden=true;editId=null});
el("invoiceForm").addEventListener("submit",async e=>{
e.preventDefault();if(!el("invoiceForm").reportValidity())return;
const amount=Number(el("amount").value),cents=Math.round(amount*100);
if(!Number.isFinite(amount)||!Number.isSafeInteger(cents)||cents<1||cents>10000000000||Math.abs(amount*100-cents)>0.00001){note(appNote,"Please enter a valid amount with two decimal places.",true);return}
const form=new FormData(el("invoiceForm"));
const r={id:editId||crypto.randomUUID(),reference:String(form.get("reference")||"").trim(),client:String(form.get("client")||"").trim(),email:String(form.get("email")||"").trim(),amount:cents,due:String(form.get("due")||""),status:String(form.get("status")||""),notes:String(form.get("notes")||"").trim()};
let record;try{record=validate(r)}catch(e){note(appNote,e.message,true);return}
const before=items;items=editId?items.map(x=>x.id===editId?record:x):items.concat([record]);
el("saveBtn").disabled=true;try{await save();el("editor").hidden=true;editId=null;draw();note(appNote,mode==="demo"?"Saved for this demo session only.":"Invoice saved and encrypted in this browser.")}catch(e){items=before;draw();note(appNote,"Unable to save invoice.",true)}finally{el("saveBtn").disabled=false}
});
function csvCell(v){let s=String(v==null?"":v);if(/^\s*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function download(filename,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
el("csvBtn").addEventListener("click",()=>{
const rows=[["reference","client","email","amount_usd","due_date","status","notes"]].concat(items.map(r=>[r.reference,r.client,r.email,(r.amount/100).toFixed(2),r.due,r.status,r.notes]));
download("paidpace-invoices.csv",rows.map(row=>row.map(csvCell).join(",")).join("\r\n"),"text/csv;charset=utf-8");
note(appNote,"CSV exported. CSV files are NOT encrypted; protect the downloaded file.")
});
el("backupBtn").addEventListener("click",()=>{if(mode!=="private")return;try{const env=getEnv();if(!env)throw Error("Missing workspace");download("paidpace-encrypted-backup.json",JSON.stringify(env,null,2),"application/json");note(appNote,"Encrypted backup downloaded. Keep your passphrase separately.")}catch(e){note(appNote,"Unable to export backup.",true)}});
el("restoreFile").addEventListener("change",async e=>{
const file=e.target.files[0];if(mode!=="private"||!file||!pass)return;
try{if(file.size>3000000)throw Error("Backup exceeds size limit.");const env=JSON.parse(await file.text());if(!validEnv(env))throw Error("Invalid encrypted backup.");const next=await decrypt(env,pass);if(!confirm("Replace all invoices with those in this backup?"))return;
const previous=localStorage.getItem(STORE);try{localStorage.setItem(STORE,JSON.stringify(env));items=next;draw();note(appNote,"Backup restored.")}catch(err){if(previous)localStorage.setItem(STORE,previous);throw err}
}catch(err){note(appNote,err.message||"Unable to restore backup.",true)}finally{e.target.value=""}
});
el("eraseBtn").addEventListener("click",()=>{if(mode!=="private")return;if(!confirm("Erase this browser's PaidPace workspace permanently? You will need a separate backup to recover it."))return;localStorage.removeItem(STORE);lock();note(gateNote,"Local workspace erased.")});
function showDraft(id){draftId=id;el("draftTone").value="warm";buildDraft()}
function buildDraft(){const r=items.find(x=>x.id===draftId);if(!r)return;const tone=el("draftTone").value;
const intro=tone==="warm"?"I hope you're doing well. I'm checking in about":tone==="firm"?"I'm following up again regarding":"I'm following up on";
const ask=tone==="warm"?"Would you mind letting me know if the payment is in process?":tone==="firm"?"Please confirm the expected payment date, or let me know if anything needs to be resolved.":"Could you confirm its payment status and expected payment date?";
el("draftText").value="Subject: Payment reminder — invoice "+r.reference+"\n\nHi "+r.client+",\n\n"+intro+" invoice "+r.reference+" for "+money(r.amount)+", originally due "+r.due+". It still appears outstanding in my records.\n\n"+ask+"\n\n"+(tone==="warm"?"Thanks so much for your help!":"Thank you for looking into this.")+"\n\nBest,\n[YOUR NAME]";
el("draftPanel").hidden=false;el("draftPanel").scrollIntoView({behavior:"smooth",block:"start"})}
el("draftTone").addEventListener("change",buildDraft);el("closeDraft").addEventListener("click",()=>{draftId=null;el("draftPanel").hidden=true;el("draftText").value=""});
el("copyDraft").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(el("draftText").value);el("draftFeedback").textContent="Copied! Review before manually sending from your own email."}catch(e){el("draftText").focus();el("draftText").select();el("draftFeedback").textContent="Text selected. Copy manually."}});
try{el("vaultHint").textContent=localStorage.getItem(STORE)?"A saved encrypted workspace exists here. Choose Unlock existing.":"No existing workspace found on this browser."}catch(e){note(gateNote,"Local storage is unavailable here. Use demo mode.",true)}
})();
