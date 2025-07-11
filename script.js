// —— Storage keys & initial data ——
const STORAGE_KEY  = 'chibi-tracker';
const SETTINGS_KEY = 'chibi-settings';

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  habits: [], totalDone:0, history:[], reminderTimes:[]
};
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
  theme:'light', skin:'default'
};

// —— Element refs ——
const htmlEl      = document.documentElement;
const listEl      = document.getElementById('habit-list');
const inputEl     = document.getElementById('habit-input');
const categoryEl  = document.getElementById('category-input');
const filterEl    = document.getElementById('filter-select');
const addBtn      = document.getElementById('add-btn');
const notifyBtn   = document.getElementById('notify-perm');
const timeInput   = document.getElementById('reminder-time');
const addTimeBtn  = document.getElementById('add-reminder');
const timesList   = document.getElementById('times-list');
const statsBtn    = document.getElementById('show-stats');
const statsSec    = document.getElementById('stats');
const closeStats  = document.getElementById('close-stats');
const statsCtx    = document.getElementById('stats-chart').getContext('2d');
const themeToggle = document.getElementById('theme-toggle');
const skinSelect  = document.getElementById('skin-select');
const chibiImg    = document.getElementById('chibi');
const growthMsg   = document.getElementById('growth-msg');

let chart, sortable;

// —— Helpers ——
function isToday(iso){ return new Date(iso).toDateString()===new Date().toDateString(); }
function chibiPath(stage){ return `assets/${settings.skin}/chibi-${stage}.jpeg`; }
function saveAll(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// —— Render UI ——
function render(){
  // --- List ---
  listEl.innerHTML='';
  const filter = filterEl.value;
  data.habits.forEach((h,i)=>{
    if(filter!=='All' && h.category!==filter) return;

    const li=document.createElement('li');
    li.draggable=true;
    li.dataset.index=i;
    li.style.cursor='grab';
    // Inline edit or text
    const textSpan=document.createElement('span');
    textSpan.textContent=`[${h.category}] ${h.text}`;
    li.appendChild(textSpan);

    // Completed styling
    if(h.lastDone && isToday(h.lastDone)) li.classList.add('completed');

    // Streak badges
    if(h.streak>=30){
      const b=document.createElement('span');
      b.className='badge'; b.textContent='🏆30';
      li.appendChild(b);
    } else if(h.streak>=7){
      const b=document.createElement('span');
      b.className='badge'; b.textContent='🎉7';
      li.appendChild(b);
    }

    // Toggle done
    li.addEventListener('click',()=>toggleDone(i));

    // Edit button
    const editBtn=document.createElement('button');
    editBtn.textContent='✏️'; editBtn.className='habit-delete';
    editBtn.addEventListener('click',e=>{
      e.stopPropagation();
      startEdit(i,li);
    });
    li.appendChild(editBtn);

    // Delete button
    const del=document.createElement('button');
    del.textContent='❌'; del.className='habit-delete';
    del.addEventListener('click',e=>{
      e.stopPropagation(); deleteHabit(i);
    });
    li.appendChild(del);

    listEl.appendChild(li);
  });

  // Initialize or update Sortable
  if(!sortable){
    sortable = Sortable.create(listEl, {
      animation:150,
      onEnd: e=>{
        const moved = data.habits.splice(e.oldIndex,1)[0];
        data.habits.splice(e.newIndex,0,moved);
        saveAll();
        render();
      }
    });
  }

  // --- Reminders ---
  timesList.innerHTML='';
  data.reminderTimes.forEach((t,i)=>{
    const chip=document.createElement('div');
    chip.className='time-chip'; chip.textContent=t;
    const btn=document.createElement('button');
    btn.textContent='✖'; btn.addEventListener('click',()=>{
      data.reminderTimes.splice(i,1);
      saveAll(); render(); scheduleAllReminders();
    });
    chip.appendChild(btn);
    timesList.appendChild(chip);
  });

  // --- Chibi ---
  const stage = Math.min(Math.floor(data.totalDone/5),5);
  chibiImg.src=chibiPath(stage);
  growthMsg.textContent= stage===5
    ? "🎉 Your chibi is fully grown! 🎉"
    : `Keep going! Stage ${stage} of 5`;

  saveAll();
}

// —— Inline edit —— 
function startEdit(idx, li){
  const h=data.habits[idx];
  li.innerHTML='';

  const input=document.createElement('input');
  input.type='text'; input.value=h.text;
  input.style.flex='2';
  const sel=document.createElement('select');
  ['Health','Work','Learning','Other'].forEach(c=>{
    const o=document.createElement('option');
    o.value=o.textContent=c;
    if(c===h.category) o.selected=true;
    sel.appendChild(o);
  });
  sel.style.flex='1';

  const saveBtn=document.createElement('button');
  saveBtn.textContent='💾'; saveBtn.className='habit-delete';
  saveBtn.addEventListener('click',()=>{
    h.text=input.value.trim()||h.text;
    h.category=sel.value;
    saveAll(); render();
  });

  li.appendChild(input);
  li.appendChild(sel);
  li.appendChild(saveBtn);
}

// —— Habit logic —— 
function toggleDone(idx){
  const h=data.habits[idx];
  if(h.lastDone && isToday(h.lastDone)) return;
  const now=new Date();
  h.lastDone=now.toISOString();
  h.doneCount=(h.doneCount||0)+1;
  // Streak: yesterday?
  if(h.lastDonePrev && isToday(h.lastDonePrev)) h.streak=(h.streak||0)+1;
  else h.streak=1;
  h.lastDonePrev=h.lastDone;
  data.totalDone++;
  // Log history
  const day=now.toISOString().slice(0,10);
  const ent=data.history.find(e=>e.date===day);
  if(ent) ent.count++; else data.history.push({date:day,count:1});
  saveAll();
  render();
  checkStreak(h.streak);
}

// —— Delete —— 
function deleteHabit(idx){
  data.habits.splice(idx,1);
  saveAll(); render();
}

// —— Add new habit —— 
addBtn.addEventListener('click',()=>{
  const txt=inputEl.value.trim();
  if(!txt) return;
  data.habits.push({
    text:txt,
    category:categoryEl.value,
    lastDone:null,
    lastDonePrev:null,
    doneCount:0,
    streak:0
  });
  inputEl.value='';
  saveAll(); render();
});

// —— Filter —— 
filterEl.addEventListener('change',render);

// —— Notifications & confetti —— 
function checkStreak(streak){
  if(streak===7 || streak===30){
    // modal
    alert(`🎉 Congrats! You've hit a ${streak}-day streak!`);
    // confetti
    confetti({ particleCount:200, spread:70 });
  }
}

// —— Reminders scheduling —— 
notifyBtn.addEventListener('click',async()=>{
  if(!('Notification' in window)) return alert('No support');
  if(Notification.permission==='granted'){
    scheduleAllReminders(); return alert('Reminders set!');
  }
  if(Notification.permission!=='denied'){
    const perm=await Notification.requestPermission();
    if(perm==='granted') scheduleAllReminders();
  }
});
addTimeBtn.addEventListener('click',()=>{
  const t=timeInput.value;
  if(t && !data.reminderTimes.includes(t)){
    data.reminderTimes.push(t);
    saveAll(); render(); scheduleAllReminders();
  }
});
function scheduleAllReminders(){
  if(window._intervals) window._intervals.forEach(clearTimeout);
  window._intervals=[];
  data.reminderTimes.forEach(t=>{
    const [h,m]=t.split(':').map(Number);
    const now=new Date(), next=new Date();
    next.setHours(h,m,0,0);
    if(now>next) next.setDate(next.getDate()+1);
    const delay=next-now;
    const tick=()=>{
      showReminder();
      window._intervals.push(setTimeout(tick,24*3600*1000));
    };
    window._intervals.push(setTimeout(tick,delay));
  });
}
function showReminder() {
  // Electron path: use the context-bridged API
  if (window.electronAPI && typeof window.electronAPI.notify === 'function') {
    window.electronAPI.notify(
      '🌸 Chibi Habit Tracker',
      'Time to log your habits!'
    );
    return;
  }

  // PWA path: service worker notifications
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(reg =>
      reg.showNotification('🌸 Chibi Habit Tracker', {
        body:    "Time to log habits!",
        icon:    chibiPath(0),
        badge:   chibiPath(0)
      })
    );
  }
}


// —— Stats dashboard —— 
statsBtn.addEventListener('click',()=>{
  statsSec.classList.remove('hidden'); drawChart();
});
closeStats.addEventListener('click',()=>statsSec.classList.add('hidden'));
function drawChart(){
  const labels=[],counts=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    labels.push(d.toLocaleDateString(undefined,{weekday:'short'}));
    const day=d.toISOString().slice(0,10);
    const ent=data.history.find(x=>x.date===day);
    counts.push(ent?ent.count:0);
  }
  if(chart) chart.destroy();
  chart=new Chart(statsCtx,{type:'bar',data:{labels,datasets:[{label:'Done',data:counts}]},options:{scales:{y:{beginAtZero:true,ticks:{stepSize:1}}},plugins:{legend:{display:false}}}});
}

// —— Theme & Skin —— 
themeToggle.addEventListener('click',()=>{
  settings.theme = settings.theme==='light'?'dark':'light';
  htmlEl.setAttribute('data-theme',settings.theme);
  saveAll();
});
skinSelect.addEventListener('change',()=>{
  settings.skin=skinSelect.value;
  htmlEl.setAttribute('data-skin',settings.skin);
  saveAll(); render();
});

// —— Service Worker & Initial Render —— 
if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');
window.addEventListener('DOMContentLoaded',()=>{
  htmlEl.setAttribute('data-theme',settings.theme);
  htmlEl.setAttribute('data-skin',settings.skin);
  render();
  if(Notification.permission==='granted') scheduleAllReminders();
});
