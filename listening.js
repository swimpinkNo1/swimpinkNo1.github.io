import {drawCollage,pauseArchiveMotion} from './field-collage.js?v=motion27';
const $=s=>document.querySelector(s),audio=$('#composition'),canvas=$('#landscape'),ctx=canvas.getContext('2d'),viewer=$('#viewer'),research=$('#research'),material=$('#material'),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
let events=[],waveData=null,duration=323.289646,entered=false,onlySound=false,energy=0,analyser=null,samples=null,audioContext=null,currentMaterial=null,activeFilter=false,endingTimer=null,lastFrame=0,previousImage='forest',imageKey='forest',imageChangedAt=0;
const phases=[{time:0,name:'GENESIS'},{time:64,name:'LIFE WITHOUT SEEING'},{time:105,name:'HUMAN DISTURBANCE'},{time:163,name:'COLLAPSE & CLIMAX'},{time:258,name:'FRACTURE & MEMORIES'},{time:291,name:'AFTERMATH & HOPE'}];
const chapters=[
 {
  "time": 0,
  "end": 64,
  "image": "forest",
  "title": "Genesis",
  "question": "Life is nurtured by nature.",
  "subtitle": "Sound is nurtured, nourished by nature",
  "interpretation": "I begin with flame, insects, a heartbeat and gentle female humming: an image of life being born and held by the Earth. The rich, detailed soundscape establishes an emotional and spiritual connection between humans and nature. This is the ecological relationship the rest of the work puts at risk.",
  "ecology": "Nature is the source of human life, not merely its background."
 },
 {
  "time": 64,
  "end": 105,
  "image": "sheep",
  "title": "Life without seeing",
  "question": "Nature exists beyond our observation.",
  "subtitle": "The secret and richness of nature",
  "interpretation": "I turn towards the richness of life beyond human perception. Recorded and reconstructed natural sounds suggest movements and presences that I encountered but could not always capture. Through this passage, I emphasise that nature exists independently of our observation.",
  "ecology": "Other forms of life have value beyond what humans notice or record."
 },
 {
  "time": 105,
  "end": 163,
  "image": "litter",
  "title": "Human Disturbance",
  "question": "Human rhythms override natural rhythms.",
  "subtitle": "The rhythm of abandonment and control",
  "interpretation": "Human intervention begins to dominate the soundscape. I translate the location metadata and counts in my photographs of litter into musical patterns, making environmental waste part of the composition. The captive penguin’s call becomes a symbol of confinement and struggle. These sounds question the ecological cost of human development and control.",
  "ecology": "Waste, noise and captivity reveal the damage caused by human dominance."
 },
 {
  "time": 163,
  "end": 258,
  "image": "storm",
  "title": "Collapse and climax",
  "question": "Human-made chaos meets natural force.",
  "subtitle": "Natural response",
  "interpretation": "Ritual percussion, low-frequency blasts and the storm-swollen river bring human desperation into collision with natural force. Aluminium cans hanging from trees sound delicate in calm weather and strike violently in storms. I use this contrast to expose the fragility of human systems: the waste we leave behind becomes a sign of ecological conflict and uncontrollability.",
  "ecology": "Pollution is not separate from nature; it becomes entangled with its forces."
 },
 {
  "time": 258,
  "end": 291,
  "image": "city",
  "title": "Fracture and Memories",
  "question": "Ecological crisis becomes a matter of conscience.",
  "subtitle": "The sound of conscience",
  "interpretation": "Running footsteps, breath, drums, bells, heartbeat and explosions evoke escape, guilt and surrender. I want the listener to confront the disconnection between humans and the living world. The suffering of animals and trees is also a warning about humanity’s own future.",
  "ecology": "The fate of human beings is inseparable from the fate of other life."
 },
 {
  "time": 291,
  "end": 323.35,
  "image": "aftermath",
  "title": "Aftermath and Hope",
  "question": "Extinction, or renewal?",
  "subtitle": "Reconnection in silence",
  "interpretation": "The singing bowl opens a space for reflection. Waves and a distant boat whistle leave an uncertain ending: extinction or rebirth? I do not offer a resolved solution. I ask for a different way of listening, one that awakens ecological sensitivity and helps us reconsider how we record, protect and repair our relationship with the environment.",
  "ecology": "Listening can begin a renewed responsibility towards the environment."
 }
];
let liveKey='',lastChapter=-1;
const focusLens={x:.5,y:.5,active:false};
function positionLens(e){const r=canvas.getBoundingClientRect();focusLens.x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));focusLens.y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));focusLens.active=true}
canvas.addEventListener('pointermove',positionLens);
canvas.addEventListener('pointerdown',positionLens);
canvas.addEventListener('pointerleave',()=>focusLens.active=false);
canvas.addEventListener('pointercancel',()=>focusLens.active=false);
canvas.addEventListener('pointerup',e=>{if(e.pointerType==='touch')focusLens.active=false});

for(const [i,c] of chapters.entries()){const b=document.createElement('button');b.className='scene-card';b.setAttribute('aria-label',`Listen to ${c.title} at ${Math.floor(c.time/60)}:${String(c.time%60).padStart(2,'0')}`);b.innerHTML=`<div class="scene-thumb"><img src="assets/user-media/${c.image}.jpg" alt="" loading="lazy"></div><small>${String(i+1).padStart(2,'0')} / ${Math.floor(c.time/60)}:${String(c.time%60).padStart(2,'0')}</small><strong>${c.title}</strong><span class="scene-fill"></span>`;b.onclick=async()=>{await seek(c.time);await play();viewer.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'})};$('#scene-cards').append(b)}
const fmt=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const ledgerReady=fetch('assets/glossary-timeline.json').then(r=>r.json()).then(j=>{events=j.events;buildLayers();update()});
fetch('assets/sound-envelope.json').then(r=>r.json()).then(j=>{waveData=j;drawWave()});
fetch('assets/bibliography.json').then(r=>r.json()).then(refs=>{for(const ref of refs){const li=document.createElement('li');li.textContent=ref;$('#bibliography').append(li)}});
fetch('assets/user-media/sources.txt').then(r=>r.text()).then(t=>$('#visual-sources').textContent=t);
// Both the live host and local preview support byte ranges: seek without fetching the entire recording.
let audioReady=null;
function loadAudio(){
 if(audio.readyState>=1&&!audio.error)return Promise.resolve();
 if(!audioReady)audioReady=new Promise((resolve,reject)=>{
  let timer;
  const clean=()=>{clearTimeout(timer);audio.removeEventListener('loadedmetadata',ready);audio.removeEventListener('error',failed)};
  const ready=()=>{clean();resolve()};
  const failed=()=>{clean();reject(Error('Recording unavailable'))};
  audio.addEventListener('loadedmetadata',ready,{once:true});audio.addEventListener('error',failed,{once:true});
  timer=setTimeout(failed,15000);audio.load();
 }).catch(error=>{audioReady=null;throw error});
 return audioReady;
}
function initialiseAnalysis(){if(audioContext)return;try{audioContext=new AudioContext();const source=audioContext.createMediaElementSource(audio);analyser=audioContext.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.9;source.connect(analyser);analyser.connect(audioContext.destination);samples=new Uint8Array(analyser.frequencyBinCount)}catch{}}
async function play(){if(audio.ended)audio.currentTime=0;$('#status').textContent='Preparing the recording…';try{await Promise.all([loadAudio(),ledgerReady]);initialiseAnalysis();if(audioContext?.state==='suspended')await audioContext.resume();await audio.play();entered=true;$('#entry').hidden=true;$('#scene-label').hidden=onlySound;$('#fragment').hidden=onlySound;$('#art-caption').hidden=onlySound;$('#ending').hidden=true;clearTimeout(endingTimer);$('#status').textContent='A continuous work. Pause or explore at any time.'}catch{$('#status').textContent='The recording could not load. Please try again.'}}
$('#enter').onclick=play;$('#play').onclick=()=>audio.paused?play():audio.pause();$('#replay').onclick=()=>{audio.currentTime=0;play()};$('#top-listen').onclick=async()=>{await seek(0);await play();viewer.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'})};
audio.addEventListener('loadedmetadata',()=>{duration=audio.duration;$('#position').max=duration;$('#trace-position').max=duration;update()});
audio.addEventListener('play',()=>{$('#play').textContent='Ⅱ';$('#play').setAttribute('aria-label','Pause complete composition');update()});
audio.addEventListener('pause',()=>{$('#play').textContent='▶';$('#play').setAttribute('aria-label','Play complete composition');pauseVideos();pauseArchiveMotion();update()});
audio.addEventListener('ended',()=>{$('#status').textContent='Take a moment. The research is here when you are ready.';endingTimer=setTimeout(()=>{$('#ending').hidden=false},2500)});
audio.addEventListener('error',()=>{$('#status').textContent='The recording could not load. Please retry from the entrance.'});
audio.addEventListener('timeupdate',update);audio.addEventListener('seeked',()=>{clearTimeout(endingTimer);$('#ending').hidden=true;update();syncVideos(true)});
async function seek(t){$('#status').textContent='Opening this passage…';try{await loadAudio();audio.currentTime=Math.max(0,Math.min(duration,t));update();$('#status').textContent=audio.paused?'Paused at this passage. Press play when you are ready.':'A continuous work. Pause or explore at any time.'}catch{$('#status').textContent='The recording could not load.'}}
for(const id of ['#position','#trace-position'])$(id).addEventListener('input',e=>seek(Number(e.target.value)));
$('#mute').onclick=()=>{audio.muted=!audio.muted;$('#mute').textContent=audio.muted?'Sound off':'Sound on';$('#mute').setAttribute('aria-label',audio.muted?'Unmute composition':'Mute composition')};
$('#hide-image').onclick=()=>{onlySound=!onlySound;$('.listening-only').hidden=!onlySound;$('#hide-image').textContent=onlySound?'Restore images':'Listen without images';$('#hide-image').setAttribute('aria-pressed',String(onlySound));$('#fragment').hidden=onlySound||!entered;$('#scene-label').hidden=onlySound||!entered;$('#art-caption').hidden=onlySound||!entered};
function activeEvents(t=audio.currentTime){return events.filter(e=>t>=e.start&&t<e.end)}
function update(){const t=audio.currentTime;$('#clock').textContent=`${fmt(t)} / ${fmt(duration)}`;$('#position').value=t;$('#trace-position').value=t;$('#trace-marker').style.left=(t/duration*100)+'%';let p=0;phases.forEach((v,i)=>{if(t>=v.time)p=i});$('#phase-label').textContent=`${String(p+1).padStart(2,'0')} / ${phases[p].name}`;for(const b of document.querySelectorAll('.layer-row')){const e=events.find(e=>e.id===b.dataset.id),on=t>=e.start&&t<e.end;b.classList.toggle('active',on);b.hidden=activeFilter&&!on}drawWave();updateExploration(t,p)}
function updateExploration(t,p){
 const active=activeEvents(t),key=active.map(e=>e.id).join('|');
 if(key!==liveKey){liveKey=key;$('#live-layers').replaceChildren();for(const e of active){const b=document.createElement('button');b.textContent=e.label+' ↗';b.onclick=()=>showMaterial(e);$('#live-layers').append(b)}$('#layer-count').textContent=active.length+' overlapping materials'}
 if(p!==lastChapter){lastChapter=p;const c=chapters[p];$('#scene-question').textContent=c.question;$('#story-number').textContent=String(p+1).padStart(2,'0')+' / '+fmt(c.time)+'–'+fmt(c.end);$('#story-title').textContent=c.title;$('#story-subtitle').textContent=c.subtitle;$('#story-text').textContent=c.interpretation;$('#story-ecology').textContent=c.ecology}
 for(const [i,b] of [...document.querySelectorAll('.scene-card')].entries()){b.setAttribute('aria-current',String(i===p));b.querySelector('.scene-fill').style.width=(Math.max(0,Math.min(1,(t-chapters[i].time)/(chapters[i].end-chapters[i].time)))*100)+'%'}
 $('.live-score').classList.toggle('is-playing',!audio.paused);
 const v=videoWindows?.find(v=>t>=v.start&&t<v.end);$('#media-state').textContent=v?'FIELD FOOTAGE / '+(audio.paused?'PAUSED':'LIVE'):'PHOTOGRAPHIC SCORE / AUDIO REACTIVE';
}
function toggleTraces(force){const visible=force??$('#traces').hidden;$('#traces').hidden=!visible;$('#traces-open').setAttribute('aria-expanded',String(visible));$('#traces-open').textContent=visible?'Close the sound traces ↑':'Trace the sounds ↓';if(visible){drawWave();update()}}
$('#traces-open').onclick=()=>toggleTraces();$('#active-only').onclick=()=>{activeFilter=!activeFilter;$('#active-only').setAttribute('aria-pressed',String(activeFilter));$('#active-only').textContent=activeFilter?'Show all layers':'Show active layers';update()};
function buildLayers(){for(const e of events){const b=document.createElement('button');b.className='layer-row';b.dataset.id=e.id;const label=document.createElement('span');label.textContent=e.label;const bar=document.createElement('span');bar.className='bar';const i=document.createElement('i');i.style.left=(e.start/duration*100)+'%';i.style.width=((e.end-e.start)/duration*100)+'%';bar.append(i);const time=document.createElement('small');time.textContent=e.timeLabel;b.append(label,bar,time);b.onclick=()=>showMaterial(e);$('#layer-list').append(b)}for(const p of phases){const b=document.createElement('button');b.textContent=fmt(p.time)+' / '+p.name;b.onclick=()=>seek(p.time);$('#phase-links').append(b)}}
let researchResume=false,materialResume=false;
function openResearch(){researchResume=!audio.paused;audio.pause();research.showModal()}
for(const id of ['#research-open','#lower-research','#ending-research','#footer-research'])$(id).onclick=openResearch;
research.addEventListener('close',()=>{if(researchResume)play();researchResume=false});
$('#research-traces').onclick=()=>{researchResume=false;research.close();toggleTraces(true);$('#traces').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'})};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>document.getElementById(b.dataset.close).close();
for(const d of [research,material])d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
for(const b of document.querySelectorAll('[role=tab]'))b.onclick=()=>{for(const tab of document.querySelectorAll('[role=tab]')){const on=tab===b;tab.setAttribute('aria-selected',String(on));document.getElementById(tab.getAttribute('aria-controls')).hidden=!on}};
function showMaterial(e){if(!e)return;currentMaterial=e;materialResume=!audio.paused;audio.pause();$('#material-time').textContent=`MATERIAL ${String(e.row-1).padStart(2,'0')} / ${e.timeLabel}`;$('#material-title').textContent=e.label;const content=$('#material-body');content.replaceChildren();for(const [heading,text] of [['In the composition',e.function],['Intended meaning',e.meaning],['Treatment',e.processing],['Source',e.source]]){const h=document.createElement('h3');h.textContent=heading;const p=document.createElement('p');p.textContent=text;content.append(h,p)}const file=document.createElement('p');file.className='material-file';file.textContent=e.material;content.append(file);material.showModal()}
material.addEventListener('close',()=>{if(materialResume)play();materialResume=false});
$('#go-material').onclick=async()=>{await seek(currentMaterial.start);material.close()};
$('#fragment').onclick=()=>{const current=activeEvents().sort((a,b)=>b.start-a.start);showMaterial(current[0]||events[0])};canvas.onclick=null;
function drawWave(){if($('#traces').hidden||!waveData)return;const c=$('#wave'),r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio,2);c.width=r.width*d;c.height=r.height*d;const wc=c.getContext('2d');wc.scale(d,d);const peaks=waveData.peaks,step=r.width/peaks.length;for(let i=0;i<peaks.length;i++){const h=Math.pow(peaks[i],.65)*r.height*.43;wc.strokeStyle=i/peaks.length<audio.currentTime/duration?'#007e7c':'#184d9c66';wc.lineWidth=Math.max(.7,step*.55);wc.beginPath();wc.moveTo(i*step,r.height*.5-h);wc.lineTo(i*step,r.height*.5+h);wc.stroke()}}
const images={};for(const key of ['forest','fire','bird','stream','sea','storm','litter','city','aftermath','sheep','bees','waste','plastic','memory','haze','shore']){const img=new Image();img.src=`assets/user-media/${key}.jpg`;images[key]=img}
const videoWindows=[{id:'river',start:166,end:185},{id:'cans',start:186,end:196},{id:'waves',start:210,end:218},{id:'calm-sea',start:196,end:201},{id:'penguin',start:126,end:130}];
for(const v of videoWindows){v.el=document.getElementById(v.id);v.el.muted=true;v.requested=false;v.ready=false}
function ensureVideo(v){
 if(v.requested)return;v.requested=true;
 const ready=()=>{v.ready=true;v.failed=false;syncVideos(true)};
 v.el.addEventListener('loadeddata',ready,{once:true});
 v.el.addEventListener('error',()=>{v.failed=true;v.requested=false},{once:true});
 v.el.preload='auto';v.el.load();
}
function pauseVideos(){for(const v of videoWindows)v.el.pause()}
function syncVideos(force=false){const t=audio.currentTime;for(const v of videoWindows){const on=t>=v.start&&t<v.end;if(t>v.start-12&&t<v.end)ensureVideo(v);if(!on){if(!v.el.paused)v.el.pause();continue}if(!v.ready||v.el.seeking)continue;const target=t-v.start;if(force||Math.abs(v.el.currentTime-target)>.5)v.el.currentTime=target;if(!audio.paused&&!reduced&&v.el.paused)v.el.play().catch(()=>{})}}
const low=document.createElement('canvas'),lc=low.getContext('2d',{willReadFrequently:true}),rawScene=document.createElement('canvas'),rawContext=rawScene.getContext('2d');let W=1,H=1,D=1;
function resize(){const r=viewer.getBoundingClientRect();W=r.width;H=r.height;D=Math.min(devicePixelRatio,1.7);canvas.width=W*D;canvas.height=H*D;rawScene.width=canvas.width;rawScene.height=canvas.height;low.width=W<600?400:720;low.height=Math.max(240,Math.round(low.width*H/W));drawWave()}
new ResizeObserver(resize).observe(viewer);resize();
function cover(c,img,x,y,w,h,zoom=1){const iw=img?.videoWidth||img?.naturalWidth||img?.width,ih=img?.videoHeight||img?.naturalHeight||img?.height;if(!iw||!ih)return;const sc=Math.max(w/iw,h/ih)*zoom,sw=w/sc,sh=h/sc,drift=reduced?0:Math.sin(audio.currentTime*.065)*.12;c.drawImage(img,Math.max(0,(iw-sw)/2+drift*(iw-sw)),Math.max(0,(ih-sh)/2+drift*(ih-sh)*.5),sw,sh,x,y,w,h)}
function chooseImage(t){if(t<31)return'forest';if(t<64)return'haze';if(t<80)return'bird';if(t<96)return'sheep';if(t<105)return'bees';if(t<126)return'litter';if(t<141)return'forest';if(t<163)return'waste';if(t<186)return'storm';if(t<196)return'forest';if(t<201)return'sea';if(t<210)return'litter';if(t<226)return'storm';if(t<237)return'city';if(t<248)return'plastic';if(t<258)return'storm';if(t<291)return'memory';if(t<309)return'shore';return'aftermath'}
function invasion(t){if(t<63)return .025;if(t<105)return .12+(t-63)/42*.1;if(t<163)return .22+(t-105)/58*.2;if(t<258)return .45+(t-163)/95*.35;if(t<291)return .85;return .12+.65*(1-(t-291)/(duration-291))}
// Visual treatment follows the work automatically. It is a website interpretation, not environmental measurement.
function encodingAt(t){if(t<64)return .38;if(t<105)return .38+(t-64)/41*.1;if(t<163)return .48+(t-105)/58*.25;if(t<258)return .73+(t-163)/95*.15;if(t<291)return .88;return .88-(t-291)/(duration-291)*.43}
const chars='01+×∴:<>/#~';
const boards=[
 {main:'forest',support:'fire',detail:'bees',relation:'HABITAT / LIFE / ENERGY',note:'An environment that holds life.'},
 {main:'sheep',support:'bird',detail:'stream',relation:'PRESENCE / BEYOND OUR SIGHT',note:'Life continues beyond our attention.'},
 {main:'litter',support:'plastic',detail:'waste',relation:'DISCARD / ACCUMULATION / CONTROL',note:'What we leave enters another habitat.'},
 {main:'storm',support:'waste',detail:'fire',relation:'PRESSURE / MATERIAL / FORCE',note:'Human traces meet natural forces.'},
 {main:'city',support:'memory',detail:'plastic',relation:'DEVELOPMENT / CONSEQUENCE / MEMORY',note:'Progress leaves a residue.'},
 {main:'sea',support:'aftermath',detail:'shore',relation:'AFTERMATH / RECONNECTION',note:'An open ending. A different way to listen.'}
];
const editorialLayouts=[
 [[.06,.15,.53,.48],[.66,.20,.28,.27],[.70,.54,.19,.17]],
 [[.38,.14,.55,.48],[.06,.17,.25,.27],[.10,.51,.19,.18]],
 [[.06,.17,.46,.48],[.59,.14,.34,.29],[.66,.49,.23,.20]],
 [[.37,.13,.56,.54],[.06,.15,.24,.25],[.09,.47,.21,.22]],
 [[.06,.14,.56,.31],[.68,.17,.25,.45],[.20,.51,.35,.18]],
 [[.07,.17,.50,.46],[.64,.16,.29,.24],[.68,.48,.22,.20]]
];
function movingLayout(phase,t,mobile){
 const slots=mobile?[[.06,.13,.88,.31],[.06,.49,.42,.20],[.53,.49,.41,.20]]:editorialLayouts[phase];
 if(reduced)return slots;
 const age=t-phases[phase].time;
 return slots.map((s,n)=>{const p=[...s];p[0]+=Math.sin(age*.14+n*1.9)*.007;p[1]+=Math.sin(age*.18+n*2.4)*.009;return p});
}
function render(now){
 requestAnimationFrame(render);if(document.hidden||now-lastFrame<65)return;lastFrame=now;
 const t=audio.currentTime,live=!audio.paused&&!audio.ended;
 if(live&&analyser){analyser.getByteFrequencyData(samples);const value=samples.reduce((a,b)=>a+b,0)/samples.length/255;energy+=(value-energy)*.14}
 syncVideos();if(onlySound){pauseArchiveMotion();return;}
 const phase=Math.max(0,phases.findLastIndex(p=>t>=p.time)),board=boards[phase],mobile=W<650;
 const video=videoWindows.find(v=>t>=v.start&&t<v.end&&v.el.readyState>=2);
 ctx.setTransform(D,0,0,D,0,0);rawContext.setTransform(D,0,0,D,0,0);
 ctx.fillStyle='#f3f1e6';ctx.fillRect(0,0,W,H);rawContext.fillStyle='#f3f1e6';rawContext.fillRect(0,0,W,H);
 const layout=!entered?[[.48,.16,.46,.49],[.69,.69,.23,.16]]:movingLayout(phase,t,mobile);
 const sources=[video?.el||images[board.main],images[board.support],images[board.detail]];
 const labels=['01 / '+(video?'FIELD FOOTAGE':'ENVIRONMENT'),'02 / '+(phase===2?'HUMAN TRACE':'COUNTERPOINT'),'03 / MATERIAL DETAIL'];
 ctx.fillStyle=phase===2||phase===3?'#e5ff5b':'#b8d1ef';const p0=layout[0];ctx.fillRect(W*(p0[0]-.018),H*(p0[1]+.025),W*.025,H*(p0[3]-.05));
 for(let n=0;n<layout.length;n++){
 const [nx,ny,nw,nh]=layout[n],[x,y,w,h]=[nx*W,ny*H,nw*W,nh*H],source=sources[n];
 const zoom=reduced?1:1.045+Math.sin(t*.11+n*1.4)*.035;
 cover(ctx,source,x,y,w,h,zoom);cover(rawContext,source,x,y,w,h,zoom);
 ctx.save();ctx.strokeStyle='#184d9c';ctx.lineWidth=.7;for(const [cx,cy] of [[x,y],[x+w,y+h]]){ctx.beginPath();ctx.moveTo(cx-4,cy);ctx.lineTo(cx+4,cy);ctx.moveTo(cx,cy-4);ctx.lineTo(cx,cy+4);ctx.stroke()}
 ctx.fillStyle='#184d9c';ctx.font=`${mobile?7:9}px 'Space Mono',monospace`;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(labels[n],x,y+h+7);ctx.restore();
 // The supporting photograph is transformed once, in its own allocated frame.
 if(n===1&&phase>=2&&phase<=4)drawFalseColour(source,x,y,w,h,zoom);
 }
 // Image-derived halftone/ASCII occupies a narrow edge of the primary image.
 const [nx,ny,nw,nh]=layout[0],asciiShare=reduced?.28:.24+Math.sin(t*.16)*.07,x=(nx+nw*(1-asciiShare))*W,y=ny*H,w=nw*asciiShare*W,h=nh*H;
 lc.clearRect(0,0,low.width,low.height);lc.drawImage(rawScene,0,0,low.width,low.height);const pixels=lc.getImageData(0,0,low.width,low.height).data;
 ctx.save();ctx.fillStyle='#f3f1e6e8';ctx.fillRect(x,y,w,h);const cell=mobile?6:8;ctx.font=`${cell}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';const ramp=' .:+x#';
 for(let yy=y;yy<y+h;yy+=cell)for(let xx=x;xx<x+w;xx+=cell){const ix=Math.min(low.width-1,Math.floor(xx/W*low.width)),iy=Math.min(low.height-1,Math.floor(yy/H*low.height)),i=(iy*low.width+ix)*4,l=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)/255;ctx.fillStyle='#184d9c';ctx.fillText(ramp[Math.min(5,Math.floor((1-l)*6))],xx,yy)}ctx.restore();
 if(entered&&!mobile){ctx.font="italic 15px Georgia,serif";ctx.fillStyle='#184d9c';ctx.textAlign='left';ctx.fillText(board.note,W*.065,H*.77)}
 // A single audio-derived line connects the images; no invented measurements.
 if(entered){ctx.save();ctx.strokeStyle=phase>=2&&phase<5?'#6c8d11':'#6e9ba7';ctx.lineWidth=1;ctx.beginPath();const start=mobile?.08:.12,end=mobile?.92:.88;for(let j=0;j<100;j++){const xx=W*(start+(end-start)*j/99),a=samples?(samples[Math.floor(j*samples.length/100)]||0)/255:0,yy=H*(mobile?.755:.81)-a*H*.035;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.stroke();ctx.restore()}
 drawFocusLens(rawScene,1);
}
function drawFalseColour(source,x,y,w,h,zoom=1){
 if(!(source?.naturalWidth||source?.videoWidth))return;
 thermalContext.clearRect(0,0,144,104);cover(thermalContext,source,0,0,144,104,zoom);
 const frame=thermalContext.getImageData(0,0,144,104),p=frame.data;
 for(let i=0;i<p.length;i+=4){const l=(p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722)/255,n=Math.min(4.999,l*5),a=Math.floor(n),f=n-a;for(let c=0;c<3;c++)p[i+c]=thermalStops[a][c]*(1-f)+thermalStops[a+1][c]*f}thermalContext.putImageData(frame,0,0);ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(thermal,x,y,w,h);ctx.restore();
}
// False-colour image study: luminance mapped to a palette, never temperature data.
const thermal=document.createElement('canvas'),thermalContext=thermal.getContext('2d',{willReadFrequently:true});
thermal.width=144;thermal.height=104;let thermalStamp=-1;
const thermalStops=[[25,12,66],[61,27,131],[213,36,139],[255,81,40],[230,255,67],[162,255,138]];
function drawThermalStudy(t,live){
 // Transform one region in place: the source remains at its original position.
 // Keep the lower caption area free of graphic overlays.
 const x=W*.44,y=H*.26,w=W*.20,h=H*.29;
 const stamp=Math.floor(performance.now()/150);
 if(stamp!==thermalStamp){thermalStamp=stamp;
 thermalContext.drawImage(rawScene,x*D,y*D,w*D,h*D,0,0,144,104);
 const frame=thermalContext.getImageData(0,0,144,104),p=frame.data;
 for(let i=0;i<p.length;i+=4){const l=(p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722)/255,n=Math.min(4.999,l*5),a=Math.floor(n),f=n-a;for(let c=0;c<3;c++)p[i+c]=thermalStops[a][c]*(1-f)+thermalStops[a+1][c]*f;p[i+3]=255}thermalContext.putImageData(frame,0,0)}
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(thermal,x,y,w,h);
 ctx.strokeStyle='#d9ff6280';ctx.lineWidth=.7;ctx.strokeRect(x,y,w,h);ctx.restore();
}
// Local magnification reveals the source without changing the authored visual progression.
function drawFocusLens(source,sourceZoom){
 if(!entered||onlySound||!focusLens.active||!$('#ending').hidden)return;
 const px=focusLens.x*W,py=focusLens.y*H,r=Math.min(W,H)*.17;
 const phase=Math.max(0,phases.findLastIndex(p=>audio.currentTime>=p.time));
 if(!movingLayout(phase,audio.currentTime,W<650).some(([x,y,w,h])=>focusLens.x>=x&&focusLens.x<=x+w&&focusLens.y>=y&&focusLens.y<=y+h))return;
 ctx.save();ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.clip();
 ctx.translate(px,py);ctx.scale(1.65,1.65);ctx.translate(-px,-py);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';cover(ctx,source,0,0,W,H,sourceZoom);ctx.restore();
 ctx.save();ctx.strokeStyle='#d2fff1';ctx.lineWidth=1.2;ctx.shadowColor='#a8edee';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.setLineDash([2,5]);ctx.strokeStyle='#c5f3ee88';ctx.beginPath();ctx.arc(px,py,r+6,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function drawDigitalField(t,clock,phase,video,live,digitalAmount){
 const strength=digitalAmount;
 // Offset strips retain the photographic trace while showing the encoding process.
 if(strength>.03){
  const slices=7,step=H/slices;ctx.save();
  for(let j=0;j<slices;j++){const pulse=Math.sin(clock*.7+j*2.1),offset=pulse*(8+energy*95)*strength;
   if(j%2===0){ctx.globalAlpha=.18+strength*.24;ctx.drawImage(low,0,j*low.height/slices,low.width,low.height/slices,offset,j*step,W,step*.85)}}
  ctx.restore();
  // An animated halftone/ASCII island grows with the narrative rather than covering every detail.
  const cell=Math.max(10,W/75),tick=Math.floor(clock*3);ctx.font=`${cell*.8}px 'Space Mono',monospace`;ctx.textAlign='center';
  for(let y=H*.12;y<H*.88;y+=cell){for(let x=W*.48;x<W*.94;x+=cell){const nx=x/W,ny=y/H,contour=Math.sin(nx*14+ny*10+clock*.13)+Math.cos(ny*18-clock*.09);if(contour<.7-phase)continue;
   const sx=Math.min(low.width-1,Math.floor(nx*low.width)),sy=Math.min(low.height-1,Math.floor(ny*low.height));
   ctx.globalAlpha=strength*(.5+phase*.4);ctx.drawImage(low,sx,sy,Math.max(1,low.width/75),Math.max(1,low.height/60),x,y,cell+1,cell+1);
   ctx.fillStyle='#07294b';ctx.fillRect(x,y,cell+1,cell+1);ctx.fillStyle='#b2e4e1';ctx.globalAlpha=strength*.8;ctx.fillText(chars[(Math.floor(x/cell)*7+Math.floor(y/cell)+tick)%chars.length],x+cell*.5,y+cell*.8)}}ctx.globalAlpha=1;
  if(!reduced){const scan=(clock*.045%1)*H;ctx.fillStyle=`rgba(148,233,235,${strength*.2})`;ctx.fillRect(0,scan,W,2);ctx.fillStyle=`rgba(126,215,231,${strength*.05})`;ctx.fillRect(0,scan-24,W,24)}
 }
 // A visible frequency portrait responds to the final mix, not invented source separation.
 if(entered&&samples){const base=H*.82,bars=48,bw=W*.68/bars;ctx.save();ctx.strokeStyle='#bcffff';ctx.fillStyle='#adf5ee';ctx.lineWidth=1.2;
  for(let i=0;i<bars;i++){const amplitude=(samples[Math.floor(i*samples.length/bars)]||0)/255;ctx.globalAlpha=(.2+strength*.6)*(live?1:.35);const h=amplitude*H*.2;ctx.fillRect(W*.09+i*bw,base-h,bw*.28,Math.max(1,h))}ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(W*.08,base);ctx.lineTo(W*.79,base);ctx.stroke();ctx.restore()}

}
requestAnimationFrame(render);update();

window.addEventListener("pagehide",()=>{audio.pause();pauseVideos();pauseArchiveMotion();clearTimeout(endingTimer)});
