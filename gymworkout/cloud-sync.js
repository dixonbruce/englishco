/* Mark's Hypertrophy Plan — Firebase cloud sync. No build tooling needed.
   The page stays functional with localStorage even if Firebase is not configured. */
const loginButton = document.getElementById('googleLogin');
const logoutButton = document.getElementById('googleLogout');
const retryButton = document.getElementById('cloudRetry');
const statusEl = document.getElementById('cloudStatus');
const accountEl = document.getElementById('cloudAccount');
const store = window.markWorkoutBridge;
const cfg = window.MARK_FIREBASE_CONFIG;
const DIRTY_KEY = 'mark-hypertrophy-cloud-dirty-v4';
const OWNER_KEY = 'mark-hypertrophy-cloud-owner-uid-v4';
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s);
const text = (value) => { statusEl.textContent = value; };
const state = { auth: null, db: null, user: null, ready: false, loading: false, unsubscribe: null, blocked: false, error: '', busyWrites: 0 };
let queuedDates = new Set();
try { queuedDates = new Set(JSON.parse(localStorage.getItem(DIRTY_KEY) || '[]').filter(validDate)); } catch (_) {}
let dirty = queuedDates;
const timers = new Map();
const versions = new Map();
const saveQueue = () => { try { localStorage.setItem(DIRTY_KEY, JSON.stringify([...dirty])); } catch (_) {} };
const configured = cfg && Object.values([cfg.apiKey, cfg.projectId, cfg.appId, cfg.authDomain]).every(v => typeof v === 'string' && v && !/PASTE_|YOUR_PROJECT_ID/.test(v));
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function updateStatus(){
 if (state.blocked) {text('Different Google account detected. Sign back into the original account to avoid mixing workout histories.'); return;}
 if (!configured) {text('Local-only mode — complete Firebase setup to enable online saving.'); return;}
 if (state.error) {text('Sync error: ' + state.error + ' — local records are still available.'); return;}
 if (!state.user) {text('Saved to this browser only · Sign in to sync online.'); return;}
 if (!navigator.onLine) {text('Offline — saved locally. Sync resumes when online.'); return;}
 if (!state.ready) {text('Connecting to your workout history…'); return;}
 if (dirty.size || state.busyWrites) {text('Saving ' + dirty.size + ' workout date(s) to the cloud…'); return;}
 text('All changes saved online ✓');
}
window.addEventListener('mark-workout-local-change', event => {
 for (const dt of event.detail?.dates || []) { if(validDate(dt)){dirty.add(dt); versions.set(dt,(versions.get(dt)||0)+1);} }
 saveQueue(); updateStatus();
 if (state.ready) for(const dt of (event.detail?.dates || [])) if(validDate(dt))scheduleWrite(dt);
});
if (!store || !configured) {
 loginButton.disabled = true;
 updateStatus();
} else {
 startFirebase().catch(e=>{state.error=e.message||String(e); updateStatus();});
}
async function startFirebase(){
 // Version kept aligned across Firebase modules.
 const version='12.17.1';
 const base='https://www.gstatic.com/firebasejs/'+version+'/';
 const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,signOut,onAuthStateChanged,browserLocalPersistence,setPersistence},firestore] = await Promise.all([
   import(base+'firebase-app.js'), import(base+'firebase-auth.js'), import(base+'firebase-firestore.js')
 ]);
 const {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,getFirestore,collection,doc,getDocsFromServer,onSnapshot,setDoc,serverTimestamp}=firestore;
 const app=initializeApp(cfg);
 const auth=getAuth(app); state.auth=auth;
 try {state.db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});}
 catch(e){state.db=getFirestore(app);}
 const db=state.db;
 loginButton.disabled=false;
 loginButton.onclick=async()=>{
   loginButton.disabled=true; state.error=''; updateStatus();
   try {
     await setPersistence(auth,browserLocalPersistence);
     try { await signInWithPopup(auth,new GoogleAuthProvider()); }
     catch(e){
       if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment','auth/cancelled-popup-request'].includes(e.code)) await signInWithRedirect(auth,new GoogleAuthProvider());
       else throw e;
     }
   }catch(e){state.error=e.code||e.message||String(e);loginButton.disabled=false;updateStatus();}
 };
 logoutButton.onclick=async()=>{
   try{await signOut(auth);}catch(e){state.error=e.code||e.message||String(e);updateStatus();}
 };
 retryButton.onclick=()=>{state.error='';if(state.user&&!state.ready)connect();else if(state.user) for(const dt of dirty)scheduleWrite(dt);updateStatus()};
 const coll=uid=>collection(db,'users',uid,'workouts');
 const ref=(uid,dt)=>doc(db,'users',uid,'workouts',dt);
 const isOwner = (uid) => {
   let original=''; try { original=localStorage.getItem(OWNER_KEY)||''; } catch(_){}
   if(original && original!==uid) return false;
   if(!original) try {localStorage.setItem(OWNER_KEY,uid);}catch(_){}
   return true;
 };
 const cancelPrevious=()=>{
    state.ready=false;state.loading=false;
    if(state.unsubscribe){state.unsubscribe();state.unsubscribe=null;}
    for(const t of timers.values())clearTimeout(t);timers.clear();
 };
 onAuthStateChanged(auth,user=>{
   cancelPrevious();state.user=user;state.error='';state.blocked=false;
   loginButton.hidden=!!user;logoutButton.hidden=!user;loginButton.disabled=!!user;
   accountEl.textContent=user ? (user.email||'Google account') : '';
   retryButton.hidden=!user;
   if(!user){loginButton.disabled=false;updateStatus();return;}
   if(!isOwner(user.uid)){state.blocked=true;updateStatus();return;}
   connect();
 });
 async function connect(){
   if(state.loading||!state.user||state.blocked)return;
   if(!navigator.onLine){updateStatus();return;}
   const uid=state.user.uid;state.loading=true;state.error='';updateStatus();
   try{
     // First read MUST come from server. Do not interpret empty cached data as an empty cloud history.
     const snapshot=await getDocsFromServer(coll(uid));
     if(state.user?.uid!==uid)return;
     const remote={};
     snapshot.docs.forEach(s=>{if(validDate(s.id) && s.data()?.data && typeof s.data().data==='object')remote[s.id]=s.data().data});
     const toLocal={};
     // Remote is authoritative for matching days unless this device has explicitly unsynced edits.
     for(const [dt,day] of Object.entries(remote))if(!dirty.has(dt)) toLocal[dt]=day;
     if(Object.keys(toLocal).length)store.setRemoteDates(toLocal);
     // Preserve old local-only dates from Version 3 or imports; upload them once.
     for(const dt of store.listDates())if(!(dt in remote)) dirty.add(dt);
     saveQueue();state.ready=true;
     if(state.unsubscribe)state.unsubscribe();
     state.unsubscribe=onSnapshot(coll(uid),{includeMetadataChanges:true}, snap=>{
       if(state.user?.uid!==uid||!state.ready||snap.metadata.fromCache)return;
       const incoming={};
       for(const change of snap.docChanges()){
         const s=change.doc;
         if(change.type==='removed'||s.metadata.hasPendingWrites||dirty.has(s.id)||!validDate(s.id))continue;
         const day=s.data()?.data;
         if(day && typeof day==='object' && !same(store.getDay(s.id),day))incoming[s.id]=day;
       }
       if(Object.keys(incoming).length)store.setRemoteDates(incoming);
       updateStatus();
     },err=>{state.error=err.code||err.message||String(err);updateStatus()});
     for(const dt of dirty)scheduleWrite(dt);
     updateStatus();
   }catch(e){state.error=e.code||e.message||String(e);updateStatus();}
   finally{state.loading=false;}
 }
 function scheduleWrite(dt){
    if(!state.ready||!validDate(dt)||state.blocked)return;
    if(timers.has(dt))clearTimeout(timers.get(dt));
    timers.set(dt,setTimeout(()=>{timers.delete(dt);writeDate(dt)},750));
 }
 async function writeDate(dt){
   const uid=state.user?.uid;
   if(!state.ready||!uid||state.blocked||!navigator.onLine)return;
   const version=versions.get(dt)||0;
   const day=store.getDay(dt);
   state.busyWrites++;updateStatus();
   try{
     await setDoc(ref(uid,dt),{data:day,updatedAt:serverTimestamp(),schema:4});
     // A newer edit, if any, must still be saved.
     if(version===(versions.get(dt)||0)){dirty.delete(dt);saveQueue();}
     else scheduleWrite(dt);
     state.error='';
   }catch(e){state.error=e.code||e.message||String(e);}
   finally{state.busyWrites--;updateStatus();}
 }
 window.addEventListener('online',()=>{state.error='';if(state.user){if(!state.ready)connect();else for(const dt of dirty)scheduleWrite(dt)}updateStatus()});
 window.addEventListener('offline',updateStatus);
 updateStatus();
}
