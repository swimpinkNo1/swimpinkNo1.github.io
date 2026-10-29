import {createMessageDeck} from './mirror-messages.js?v=1';
import {blowingPose,createWandGate,createBreathGate} from './mirror-gestures.js?v=wand2';
const $=s=>document.querySelector(s),stage=$('#mirror-stage'),canvas=$('#mirror-canvas'),ctx=canvas.getContext('2d'),video=$('#camera-feed'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const make=()=>{const c=document.createElement('canvas');return[c,c.getContext('2d')]};
const [fog,fogctx]=make(),[frost,frostctx]=make(),[heat,heatctx]=make(),[message,msgctx]=make(),[writing,writingctx]=make(),[freshWriting,freshctx]=make(),[shade,shadectx]=make(),[condensation,condctx]=make();
let W=900,H=550,torch=true,breathing=false,breathUntil=0,interacted=false,cameraStream=null,audioStream=null,audioContext=null,analyser=null,micFloor=.012,face=null,hand=null,sensing=false,tracking=false,lastInference=0,handPoint=null,lastPointer=null,lastFrame=0,phase=0,raf;
let breathPoint=null,wandTarget=null,wandLastSeen=0,lastWandPoint=null,wandTrail=[],handFrames=0,lightMemory=null,lightStrength=0;
const wandGate=createWandGate(),breathGate=createBreathGate(),nextMessage=createMessageDeck();
let currentMessage=nextMessage(),lastMessageChange=-Infinity,liveBlowing=false,mistStart=null;
let mirrorMode="welcome";
let pointer={x:innerWidth/2,y:innerHeight/2,inside:false,down:false};
const letters=[...document.querySelectorAll('.secret-letter')],records=[...document.querySelectorAll('.archive-sheet')];
function touchGlass(){if(mirrorMode==='welcome')return;if(!interacted){interacted=true;stage.classList.add('interacted')}}
function resizeMirror(){const r=stage.getBoundingClientRect();W=Math.round(Math.min(1100,r.width*1.2));H=Math.round(W*r.height/r.width);for(const c of [canvas,fog,frost,heat,message,writing,freshWriting,shade,condensation]){c.width=W;c.height=H}fogctx.clearRect(0,0,W,H);heatctx.clearRect(0,0,W,H);writingctx.clearRect(0,0,W,H);buildCondensation();drawMessage()}
function seedFog(amount){fogctx.clearRect(0,0,W,H);const g=fogctx.createRadialGradient(W*.5,H*.5,5,W*.5,H*.5,W*.65);g.addColorStop(0,`rgba(255,255,255,${amount})`);g.addColorStop(1,`rgba(255,255,255,${amount*.72})`);fogctx.fillStyle=g;fogctx.fillRect(0,0,W,H)}
function chooseMessage(t=performance.now()){currentMessage=nextMessage();lastMessageChange=t;heatctx.clearRect(0,0,W,H);writingctx.clearRect(0,0,W,H);drawMessage()}
function drawMessage(){
 msgctx.clearRect(0,0,W,H);msgctx.fillStyle='#fff';msgctx.textAlign='center';
 const size=Math.min(W/9,94);msgctx.font=`600 ${size}px Caveat, cursive`;msgctx.lineJoin='round';msgctx.lineCap='round';
 const words=currentMessage.split(' '),lines=[];let line='';
 for(const word of words){const test=line?line+' '+word:word;if(line&&msgctx.measureText(test).width>W*.79){lines.push(line);line=word}else line=test}if(line)lines.push(line);
 const lineHeight=size*1.04,start=H*.49-(lines.length-1)*lineHeight/2;
 lines.forEach((text,i)=>{msgctx.save();msgctx.translate(W*.5,start+i*lineHeight);msgctx.rotate(-.025+i*.012);msgctx.fillText(text,0,0);msgctx.restore()});
}
new ResizeObserver(resizeMirror).observe(stage);
document.fonts.load('600 80px Caveat').then(()=>{writingctx.clearRect(0,0,W,H);drawMessage()}).catch(()=>{});
function strokeMask(context,a,b,radius,erase=false,alpha=1){context.save();context.globalCompositeOperation=erase?'destination-out':'source-over';context.lineWidth=radius*1.1;context.lineCap='round';context.strokeStyle=`rgba(255,255,255,${alpha*.6})`;if(a){context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke()}const g=context.createRadialGradient(b.x,b.y,0,b.x,b.y,radius);g.addColorStop(0,`rgba(255,255,255,${alpha})`);g.addColorStop(.5,`rgba(255,255,255,${alpha*.8})`);g.addColorStop(1,'rgba(255,255,255,0)');context.fillStyle=g;context.fillRect(b.x-radius,b.y-radius,radius*2,radius*2);context.restore()}
function toMirror(p){const r=stage.getBoundingClientRect();return{x:(p.x-r.left)/r.width*W,y:(p.y-r.top)/r.height*H}}
function mirrorHit(p){const r=stage.getBoundingClientRect();return p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom}
function updateSurface(p,previous,wand=false){if(mirrorMode==='welcome'||!mirrorHit(p))return;const m=toMirror(p),prev=previous&&mirrorHit(previous)?toMirror(previous):null;if(torch||wand){const radius=Math.max(38,Math.min(80,W*.075));strokeMask(heatctx,prev,m,radius,false,.82);touchGlass();$('#mirror-state').textContent='Follow the hidden strokes. The message is beginning to appear.'}else{strokeMask(fogctx,prev,m,Math.max(18,W*.032),true,.65);touchGlass();$('#mirror-state').textContent='Your touch leaves a trace.'}}
function setTorch(on,initial=false){torch=on;document.body.classList.toggle('lit',on);if(!on)document.body.classList.remove('reading-lit');$('#torch-toggle').setAttribute('aria-pressed',String(on));$('#torch-label').textContent=on?'Extinguish the light':'Ignite the light';$('#camera-status').textContent=on?'Carry the light with you. Some traces are waiting to be found.':'A message is hidden here. Start with a gentle breath.';if(on){positionCursor(pointer)}}
$('#torch-toggle').onclick=()=>setTorch(!torch);
function positionCursor(p){$('#light-cursor').style.transform=`translate(${p.x-12}px,${p.y-18}px)`}
function startBreath(){if(mirrorMode!=='pointer'||cameraStream)return;if(!breathing&&performance.now()-lastMessageChange>3000)chooseMessage();touchGlass();breathing=true;$('#breath-button').classList.add('breathing');$('#mirror-state').textContent='The glass is clouding. What is hiding underneath?'}
function stopBreath(){breathing=false;$('#breath-button').classList.remove('breathing')}
$('#breath-button').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);startBreath()});$('#breath-button').addEventListener('pointerup',stopBreath);$('#breath-button').addEventListener('pointercancel',stopBreath);
window.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key.toLowerCase()==='l'&&!e.repeat)setTorch(!torch);if(e.key.toLowerCase()==='b'&&!e.repeat){e.preventDefault();startBreath()}if(e.key==='Escape'){setTorch(false);stopBreath()}});window.addEventListener('keyup',e=>{if(e.key.toLowerCase()==='b')stopBreath()});window.addEventListener('blur',()=>{stopBreath();lastPointer=null});
$('#mirror-reset').onclick=()=>{fogctx.clearRect(0,0,W,H);chooseMessage();touchGlass();$('#mirror-state').textContent='Another secret is waiting. Breathe onto the glass to begin.'};
window.addEventListener('pointermove',e=>{const next={x:e.clientX,y:e.clientY,inside:true,down:e.buttons>0};pointer=next;positionCursor(next);if(!cameraStream&&interacted&&(e.pointerType!=='touch'||e.buttons))updateSurface(next,lastPointer);lastPointer=next;explorePage(next)}, {passive:true});
stage.addEventListener('pointerdown',e=>{if(mirrorMode!=='pointer'||cameraStream||e.target.closest('button,a,input'))return;pointer={x:e.clientX,y:e.clientY,inside:true,down:true};stage.setPointerCapture(e.pointerId);lastPointer=pointer;updateSurface(pointer,null)});stage.addEventListener('pointerup',()=>{pointer.down=false;lastPointer=null});
function explorePage(p){const overMirror=mirrorHit(p);if(!overMirror&&!document.body.classList.contains('outside-mirror')&&!torch)setTorch(true);document.body.classList.toggle('outside-mirror',!overMirror);document.body.classList.toggle('in-mirror',overMirror);document.querySelectorAll('.render-study').forEach(el=>{const r=el.getBoundingClientRect();el.style.setProperty('--rx',(p.x-r.left)+'px');el.style.setProperty('--ry',(p.y-r.top)+'px')});document.body.classList.toggle('reading-lit',torch&&!overMirror);document.body.style.setProperty('--page-light-x',p.x+'px');document.body.style.setProperty('--page-light-y',p.y+'px');letters.forEach(l=>{const r=l.getBoundingClientRect(),near=torch&&p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom;l.classList.toggle('near',near);if(near){const copy=l.querySelector('.letter-light').getBoundingClientRect();l.style.setProperty('--lx',`${p.x-copy.left}px`);l.style.setProperty('--ly',`${p.y-copy.top}px`)}});if(torch)records.forEach(s=>revealArchive(s,p))}
window.addEventListener('scroll',()=>{if(torch)explorePage(pointer)},{passive:true});
letters.forEach(l=>{const open=()=>l.classList.toggle('open');l.onclick=open;l.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});$('#reveal-letter').onclick=()=>letters.forEach(l=>l.classList.add('open'));
function paintVeil(sheet){const c=sheet.querySelector('canvas'),r=sheet.querySelector('.archive-image').getBoundingClientRect();if(r.width<1)return;const before=c.width;c.width=Math.round(r.width*1.3);c.height=Math.round(r.height*1.3);const x=c.getContext('2d');x.fillStyle='#eceee9';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#174aaf0c';x.lineWidth=1;for(let i=-c.height;i<c.width;i+=18){x.beginPath();x.moveTo(i,0);x.lineTo(i+c.height,c.height);x.stroke()}x.fillStyle='#174aaf60';x.textAlign='center';x.font=`italic ${c.width*.047}px Georgia`;sheet.dataset.revealed='false'}
records.forEach(s=>new ResizeObserver(()=>paintVeil(s)).observe(s.querySelector('.archive-image')));
function revealArchive(sheet,p){const r=sheet.querySelector('.archive-image').getBoundingClientRect();if(p.x<r.left||p.x>r.right||p.y<r.top||p.y>r.bottom)return;const c=sheet.querySelector('canvas'),x=c.getContext('2d');strokeMask(x,null,{x:(p.x-r.left)/r.width*c.width,y:(p.y-r.top)/r.height*c.height},c.width*.09,true,.85);sheet.dataset.revealed='true'}
const archive=[{title:'Before it could answer.',image:'original-sketch.png',kind:'ORIGINAL CONCEPT SKETCH / 2024',caption:'The original Magic Artist Mirror explored drawing, reflection and self-expression through a proposed interactive mirror. This is a concept drawing, not a photograph of a built installation.'},{title:'From tools to gestures.',image:'original-wireframe.jpg',kind:'ORIGINAL WIREFRAME / 2024',caption:'The original interface studies considered presence, looking towards the mirror and looking away, alongside drawing controls. The 2026 web iteration explores breath, touch and light.'},{title:'A small pause in a public place.',image:'original-storyboard.jpg',kind:'SPECULATIVE EXPERIENCE STORYBOARD / 2024',caption:'A scene from the original storyboard imagines an encounter with the mirror. The depicted response is a speculative design scenario, not a measured user outcome.'}];let recordIndex=0,recordReturn;
function openRecord(i){recordIndex=(i+archive.length)%archive.length;const a=archive[recordIndex];$('#record-number').textContent=String(recordIndex+1).padStart(2,'0')+' / '+a.kind;$('#record-title').textContent=a.title;$('#record-image').src='assets/magic-mirror/'+a.image;$('#record-image').alt=a.kind.toLowerCase();$('#record-caption').textContent=a.caption;if(!$('#record-dialog').open){recordReturn=document.activeElement;$('#record-dialog').showModal()}}
document.querySelectorAll('.open-record').forEach(b=>b.onclick=()=>openRecord(+b.dataset.record));$('.close-record').onclick=()=>$('#record-dialog').close();$('#record-dialog').addEventListener('close',()=>recordReturn?.focus({preventScroll:true}));$('#record-prev').onclick=()=>openRecord(recordIndex-1);$('#record-next').onclick=()=>openRecord(recordIndex+1);
function moistureSeed(i){const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n)}
function drawBead(c,x,y,r,stretch=1){
 c.save();c.translate(x,y);c.scale(1,stretch);
 const g=c.createRadialGradient(-r*.3,-r*.35,r*.06,0,0,r);
 g.addColorStop(0,'rgba(255,255,255,.58)');g.addColorStop(.25,'rgba(240,248,244,.16)');g.addColorStop(.7,'rgba(65,87,86,.06)');g.addColorStop(1,'rgba(44,67,69,.23)');
 c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
 c.strokeStyle='rgba(255,255,250,.35)';c.lineWidth=.45;c.beginPath();c.arc(0,0,r*.75,3.5,5.1);c.stroke();c.restore();
}
function buildCondensation(){
 condctx.clearRect(0,0,W,H);
 // Broad translucent patches avoid a flat white veil and a repeating particle grid.
 for(let i=0;i<42;i++){
  const x=moistureSeed(i+1)*W,y=moistureSeed(i+91)*H,r=W*(.04+moistureSeed(i+171)*.14),g=condctx.createRadialGradient(x,y,0,x,y,r);
  const pale=i%3!==0;g.addColorStop(0,pale?'rgba(255,255,249,.16)':'rgba(78,111,110,.09)');g.addColorStop(1,'rgba(255,255,255,0)');condctx.fillStyle=g;condctx.fillRect(x-r,y-r,r*2,r*2);
 }
 const count=Math.min(1900,Math.round(W*H/580));
 for(let i=0;i<count;i++){
  const x=moistureSeed(i+700)*W,y=moistureSeed(i+3700)*H,size=moistureSeed(i+6200),r=.35+Math.pow(size,4)*3.1;
  drawBead(condctx,x,y,r,1+moistureSeed(i+9100)*.55);
 }
}
function drawRivulets(t){
 for(let i=0;i<10;i++){
  const x=W*(.04+moistureSeed(i+13000)*.92),speed=.0014+moistureSeed(i+14000)*.002;
  const y=(moistureSeed(i+15000)*H+(reduced?0:t*speed))%(H+100)-40,r=1.5+moistureSeed(i+16000)*2.1,length=18+moistureSeed(i+17000)*52;
  const trail=frostctx.createLinearGradient(x,y-length,x,y);trail.addColorStop(0,'rgba(255,255,255,0)');trail.addColorStop(1,'rgba(112,137,133,.14)');
  frostctx.strokeStyle=trail;frostctx.lineWidth=r*.65;frostctx.lineCap='round';frostctx.beginPath();frostctx.moveTo(x+Math.sin(i)*2,y-length);frostctx.bezierCurveTo(x-2,y-length*.6,x+2,y-length*.25,x,y);frostctx.stroke();drawBead(frostctx,x,y,r,1.65);
 }
}
function reflectedSurface(t){if(cameraStream&&video.readyState>=2){ctx.save();ctx.translate(W,0);ctx.scale(-1,1);const scale=Math.max(W/video.videoWidth,H/video.videoHeight),w=video.videoWidth*scale,h=video.videoHeight*scale;ctx.drawImage(video,(W-w)/2,(H-h)/2,w,h);ctx.restore()}else{const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#c4cfcb');g.addColorStop(.24,'#e3e9df');g.addColorStop(.44,'#8fa498');g.addColorStop(.65,'#b5c2b9');g.addColorStop(1,'#70877e');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}}
function animate(t){raf=requestAnimationFrame(animate);if(document.hidden||t-lastFrame<30)return;const dt=Math.min(t-lastFrame,80);lastFrame=t;phase=t;
 reflectedSurface(t);
 const misting=(!cameraStream&&breathing)||(cameraStream&&sensing&&t<breathUntil);if(!misting)mistStart=null;
 if(misting){if(mistStart===null)mistStart=t;const spread=Math.min(1,(t-mistStart)/1600),radius=W*.28+Math.max(W,H)*.5*spread;const x=breathPoint?.x??W*.5,y=breathPoint?.y??H*.58;strokeMask(fogctx,null,{x:x+Math.sin(t*.001)*W*.03,y},radius,false,.085);heatctx.save();heatctx.globalCompositeOperation='destination-out';heatctx.fillStyle='rgba(0,0,0,.018)';heatctx.fillRect(0,0,W,H);heatctx.restore()}
 fogctx.save();fogctx.globalCompositeOperation='destination-out';fogctx.fillStyle=`rgba(0,0,0,${dt*.000018})`;fogctx.fillRect(0,0,W,H);fogctx.restore();
 heatctx.save();heatctx.globalCompositeOperation='destination-out';heatctx.fillStyle=`rgba(0,0,0,${dt*.00011})`;heatctx.fillRect(0,0,W,H);heatctx.restore();
 if(cameraStream&&wandTarget&&t-wandLastSeen<440){
  handPoint=handPoint?{x:handPoint.x+(wandTarget.x-handPoint.x)*.42,y:handPoint.y+(wandTarget.y-handPoint.y)*.42}:{...wandTarget};
  updateSurface(handPoint,lastWandPoint,true);lastWandPoint={...handPoint};wandTrail.push({...toMirror(handPoint),time:t});
  document.body.classList.add('finger-wand');
 }else{handPoint=null;lastWandPoint=null;document.body.classList.remove('finger-wand');if(!cameraStream&&interacted&&torch&&mirrorHit(pointer)){updateSurface(pointer,pointer);wandTrail.push({...toMirror(pointer),time:t})}}
 // The letters are holes in condensation, not coloured text placed over the image.
 freshctx.save();freshctx.globalCompositeOperation='source-over';freshctx.clearRect(0,0,W,H);freshctx.drawImage(message,0,0);freshctx.globalCompositeOperation='destination-in';freshctx.drawImage(heat,0,0);freshctx.restore();
 writingctx.drawImage(freshWriting,0,0);
 frostctx.save();frostctx.globalCompositeOperation='source-over';frostctx.clearRect(0,0,W,H);frostctx.filter='blur(15px)';frostctx.drawImage(canvas,0,0);frostctx.filter='none';frostctx.fillStyle='rgba(235,241,235,.70)';frostctx.fillRect(0,0,W,H);
 // Cached irregular moisture and sparse slow rivulets remain attached to the glass.
 frostctx.drawImage(condensation,0,0);drawRivulets(t);
 frostctx.globalCompositeOperation='destination-in';frostctx.drawImage(fog,0,0);
 // A thin wet rim borders the transparent finger strokes, without colouring the letters.
 frostctx.save();frostctx.globalCompositeOperation='source-atop';frostctx.globalAlpha=.16;frostctx.filter='blur(2px)';frostctx.drawImage(writing,0,0);frostctx.restore();
 frostctx.globalCompositeOperation='destination-out';frostctx.drawImage(writing,0,0);frostctx.restore();ctx.drawImage(frost,0,0);
 const lightPoint=cameraStream?handPoint:interacted&&torch&&mirrorHit(pointer)?pointer:null;document.body.classList.toggle('finger-wand',Boolean(lightPoint));drawAtmosphere(lightPoint,dt);drawWand(t,lightPoint);
 if(torch){const flicker=reduced?1:1+Math.sin(t*.013)*.03;$('#light-cursor svg').style.scale=String(flicker)}
 if(cameraStream&&sensing&&t-lastInference>75){lastInference=t;infer(t)}
}
raf=requestAnimationFrame(animate);
let trackingAbort=null;
async function setupSensing(){
 const currentStream=cameraStream;trackingAbort?.abort();const controller=new AbortController();trackingAbort=controller;
 stage.dataset.trackingState='loading';
 try{
 const {loadMirrorTracking}=await import('./mirror-tracking.js?v=tracking26');
 const detectors=await loadMirrorTracking({signal:controller.signal,onProgress:text=>{if(cameraStream===currentStream)$('#camera-status').textContent=text}});
 if(cameraStream!==currentStream||!cameraStream||controller.signal.aborted){detectors.face.close();detectors.hand.close();return}
 face=detectors.face;hand=detectors.hand;sensing=true;stage.dataset.trackingState='ready';
 $('#sensing-retry').hidden=true;$('#mouth-status').textContent='The mirror sees you · try a gentle blow';$('#hand-status').textContent='Raise your index finger · it is your wand';
 $('#camera-status').textContent='Try blowing gently towards the camera. When the glass clouds, raise your index finger — someone left you a message.';
 }catch(error){if(controller.signal.aborted)return;controller.abort();stage.dataset.trackingState='error';$('#mouth-status').textContent='Mouth tracking unavailable';$('#hand-status').textContent='Fingertip tracking unavailable';throw error}
}

function mapCameraPoint(p){const scale=Math.max(W/video.videoWidth,H/video.videoHeight);return{x:(1-p.x)*video.videoWidth*scale+(W-video.videoWidth*scale)/2,y:p.y*video.videoHeight*scale+(H-video.videoHeight*scale)/2}}
// Dim the reflection itself; the travelling light reveals its original colours.
function drawAtmosphere(point,dt){
 const target=point?1:0;
 lightStrength+=(target-lightStrength)*(1-Math.exp(-dt/(point?160:850)));
 if(point)lightMemory=toMirror(point);
 shadectx.clearRect(0,0,W,H);
 const edge=shadectx.createRadialGradient(W*.5,H*.46,Math.min(W,H)*.12,W*.5,H*.46,Math.hypot(W,H)*.58);
 edge.addColorStop(0,'rgba(13,26,29,.13)');edge.addColorStop(.5,'rgba(13,26,29,.30)');edge.addColorStop(1,'rgba(7,17,24,.66)');
 shadectx.fillStyle=edge;shadectx.fillRect(0,0,W,H);
 if(lightMemory&&lightStrength>.002){
  const p=lightMemory,r=Math.min(W,H)*.48;
  const opening=shadectx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
  opening.addColorStop(0,`rgba(0,0,0,${lightStrength})`);opening.addColorStop(.3,`rgba(0,0,0,${lightStrength*.94})`);opening.addColorStop(.67,`rgba(0,0,0,${lightStrength*.48})`);opening.addColorStop(1,'rgba(0,0,0,0)');
  shadectx.save();shadectx.globalCompositeOperation='destination-out';shadectx.fillStyle=opening;shadectx.fillRect(0,0,W,H);shadectx.restore();
 }
 ctx.drawImage(shade,0,0);
}
function drawWand(t,lightPoint){
 wandTrail=wandTrail.filter(p=>t-p.time<650);
 ctx.save();ctx.lineCap='round';
 for(let i=1;i<wandTrail.length;i++){const a=wandTrail[i-1],b=wandTrail[i],alpha=Math.max(0,1-(t-b.time)/650);ctx.strokeStyle=`rgba(123,189,255,${alpha*.55})`;ctx.lineWidth=Math.max(1,W*.0025)*alpha;ctx.shadowColor='#75b8ff';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
 if(lightPoint){const p=toMirror(lightPoint),r=Math.max(52,W*.105);
  ctx.shadowBlur=0;
  const bloom=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
  bloom.addColorStop(0,'rgba(255,252,231,.46)');bloom.addColorStop(.16,'rgba(223,242,255,.28)');bloom.addColorStop(.48,'rgba(135,191,244,.12)');bloom.addColorStop(1,'rgba(135,191,244,0)');
  ctx.fillStyle=bloom;ctx.fillRect(p.x-r,p.y-r,r*2,r*2);
  const core=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*.32);
  core.addColorStop(0,'rgba(255,255,245,1)');core.addColorStop(.12,'rgba(255,252,230,.95)');core.addColorStop(.4,'rgba(189,224,255,.45)');core.addColorStop(1,'rgba(120,185,255,0)');
  ctx.fillStyle=core;ctx.beginPath();ctx.arc(p.x,p.y,r*.32,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function infer(t){if(!face||!hand||video.readyState<2)return;try{
 const f=face.detectForVideo(video,t),h=hand.detectForVideo(video,t),landmarks=f.faceLandmarks?.[0];
 $('#mouth-status').textContent=landmarks?'The mirror sees you · try a gentle blow':'Come closer · let the mirror see your face';const mouth=landmarks?.[13];if(mouth)breathPoint=mapCameraPoint(mouth);
 const scores=Object.fromEntries((f.faceBlendshapes?.[0]?.categories||[]).map(v=>[v.categoryName,v.score]));
 let pose=blowingPose(landmarks,scores);
 if(analyser&&pose){const values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);const rms=Math.sqrt(values.reduce((a,b)=>a+b*b,0)/values.length);pose=rms>Math.max(.017,micFloor*2.4)}
 const isBlowing=breathGate.update(Boolean(landmarks),pose,t);if(isBlowing){if(!liveBlowing&&t-lastMessageChange>3000)chooseMessage(t);breathUntil=t+120;touchGlass();$('#mirror-state').textContent='The mirror heard your breath. Raise your index finger to uncover the message.'}else breathUntil=0;liveBlowing=isBlowing;
 $('#mouth-status').textContent=isBlowing?'The glass is clouding · a message awaits':pose?'A little longer… the glass is clouding':landmarks?'The mirror sees you · try a gentle blow':'Come closer · let the mirror see your face';
 const points=h.landmarks?.[0];
 const wand=wandGate.update(points,t);$('#hand-status').textContent=wand.tracked?'Your fingertip holds the light · uncover the words':points?'Almost there · point with your index finger':'Raise your index finger · it is your wand';
 if(wand.tracked){
  const m=mapCameraPoint(points[8]),r=stage.getBoundingClientRect();
  const next={x:r.left+m.x/W*r.width,y:r.top+m.y/H*r.height};
  // Reacquiring a distant hand starts a fresh stroke rather than drawing a long bridge.
  if(!wandTarget||t-wandLastSeen>180||Math.hypot(next.x-wandTarget.x,next.y-wandTarget.y)>r.width*.22){lastWandPoint=null;handPoint=null;wandTrail=[]}
  wandTarget=next;wandLastSeen=t;touchGlass();$('#mirror-state').textContent='There it is. Let your fingertip follow the hidden words.';
 }else if(!wand.active){wandTarget=null;handPoint=null;lastWandPoint=null}

 }catch(e){console.warn('Gesture sensing stopped',e);$('#sensing-retry').hidden=false;sensing=false;breathUntil=0;breathGate.reset();wandTarget=null;handPoint=null;$('#camera-status').textContent='Camera reflection is available. Gesture sensing stopped; try turning the camera off and on.'}}
function stopCamera(){
 trackingAbort?.abort();trackingAbort=null;stage.dataset.trackingState='idle';
 stopBreath();mistStart=null;lastPointer=null;pointer.down=false;
 for(const layer of [fogctx,heatctx,writingctx,freshctx,frostctx])layer.clearRect(0,0,W,H);
 lightMemory=null;lightStrength=0;
 $('#mirror-state').textContent='Someone has been here before you.';
 mirrorMode='welcome';interacted=false;stage.classList.remove('interacted');$('#gesture-status').hidden=true;$('#sensing-retry').hidden=true;wandGate.reset();liveBlowing=false;breathGate.reset();breathUntil=0;breathPoint=null;wandTarget=null;handPoint=null;lastWandPoint=null;wandTrail=[];handFrames=0;document.body.classList.remove('finger-wand');$('#breath-button').disabled=false;cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;video.srcObject=null;sensing=false;handPoint=null;face?.close();hand?.close();face=null;hand=null;stopMicrophone();$('#camera-toggle').textContent='Use my camera ↗';$('#mirror-mode').textContent='CAMERA EXPERIENCE / READY TO START';$('#camera-status').textContent='Camera off. Pointer and touch remain available.'}
$('#enter-camera').onclick=()=>$('#camera-toggle').click();$('#enter-pointer').onclick=()=>{mirrorMode='pointer';$('#mirror-mode').textContent='POINTER DEMO / NO CAMERA';touchGlass();$('#camera-status').textContent='Hold Breathe to cloud the glass. Then move your light — a message is waiting.'};
$('#camera-toggle').onclick=async()=>{if(cameraStream){stopCamera();return}const b=$('#camera-toggle');b.disabled=true;b.textContent='Opening the mirror…';try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera access needs HTTPS or localhost.');cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});stopBreath();wandGate.reset();liveBlowing=false;breathUntil=0;breathGate.reset();fogctx.clearRect(0,0,W,H);chooseMessage();$('#breath-button').disabled=true;video.srcObject=cameraStream;await video.play();mirrorMode='camera';touchGlass();$('#gesture-status').hidden=false;$('#mirror-mode').textContent='LIVE CAMERA MIRROR';b.textContent='Turn camera off';b.disabled=false;$('#camera-status').textContent='The mirror is waking. Wait a moment…';try{await setupSensing()}catch(e){console.error('Gesture models unavailable',e);$('#sensing-retry').hidden=false;$('#camera-status').textContent='Reflection ready. Gesture sensing could not load; turn the camera off to use pointer mode.'}}catch(e){$('#camera-status').textContent=e.name==='NotAllowedError'?'Camera access was not granted. You can still use the pointer study.':'Camera unavailable. Pointer and touch still work.';b.textContent='Use my camera ↗';cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;$('#breath-button').disabled=false}finally{b.disabled=false}};
function stopMicrophone(){audioStream?.getTracks().forEach(t=>t.stop());audioStream=null;audioContext?.close();audioContext=null;analyser=null;$('#breath-audio').checked=false}
$('#breath-audio').onchange=async e=>{if(!e.target.checked){stopMicrophone();return}try{audioStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false},video:false});audioContext=new AudioContext();analyser=audioContext.createAnalyser();analyser.fftSize=512;audioContext.createMediaStreamSource(audioStream).connect(analyser);const samples=new Float32Array(512);analyser.getFloatTimeDomainData(samples);micFloor=Math.sqrt(samples.reduce((a,b)=>a+b*b,0)/samples.length);$('#camera-status').textContent='Microphone enabled for breath cues. Mouth gesture sensing needs the camera.'}catch(e){stopMicrophone();$('#camera-status').textContent='Microphone unavailable. The Breathe control still works.'}};
window.addEventListener('pagehide',()=>{stopCamera();cancelAnimationFrame(raf)});
window.addEventListener('pageshow',e=>{if(e.persisted){lastFrame=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(animate)}});
// The original six-scene narrative stays readable without hunting with a light.
const scenes=[
 ['The Waiting Room Glow','In a dim psychotherapy waiting room, a softly glowing mirror catches the attention of a patient arriving with slumped shoulders.','An invitation that asks very little: simply notice the light.','THE WAITING ROOM'],
 ['Hesitant Interaction','The visitor approaches. A prompt — “Draw your feelings” — appears. They tentatively lift a hand, and colourful swirls begin to form.','A small movement becomes a first mark.','THE FIRST GESTURE'],
 ['Immersive Calm','In the original scenario, soft music and visuals respond to the visitor’s gestures. The storyboard imagines their shoulders relaxing and a smile emerging.','An imagined response, rather than a measured wellbeing outcome.','A MOMENT TO CREATE'],
 ['Elevator Discovery','Two strangers notice the mirror in an urban elevator. One waves a hand, and a playful animation invites a shared moment.','The reflection becomes a reason to acknowledge someone else.','THE ELEVATOR'],
 ['Collaborative Creation','Both visitors add shapes and textures to the shared canvas. The original storyboard imagines them capturing the artwork before saying goodbye.','A private reflection becomes a shared surface.','TWO PEOPLE / ONE CANVAS'],
 ['Shared Inspiration','The proposal extends the idea to a library, museum and café: places where visitors might create together and leave traces of an encounter.','What could a small act of creativity leave behind?','LIBRARY / MUSEUM / CAFÉ']
];
let sceneIndex=0,requestedScene=0,sceneRequest=0;const sceneImages=new Map();
function loadSceneImage(src){if(!sceneImages.has(src)){const promise=new Promise((resolve,reject)=>{const image=new Image();const timer=setTimeout(()=>{image.onload=image.onerror=null;reject(Error('Storyboard image timed out'))},12000);image.onload=()=>{clearTimeout(timer);resolve()};image.onerror=()=>{clearTimeout(timer);reject(Error('Storyboard image unavailable'))};image.src=src}).catch(error=>{sceneImages.delete(src);throw error});sceneImages.set(src,promise)}return sceneImages.get(src)}
async function showScene(i){const target=(i+scenes.length)%scenes.length,request=++sceneRequest;requestedScene=target;const src='assets/magic-mirror/scene-'+(target+1)+'.jpg';$('.scene-player').setAttribute('aria-busy','true');try{await loadSceneImage(src);if(request!==sceneRequest)return;sceneIndex=target;const [title,description,question,place]=scenes[target];$('#scene-original').src=src;$('#scene-original').alt='YongHong Chen’s original storyboard: '+title;$('#scene-title').textContent=title;$('#scene-description').textContent=description;$('#scene-question').textContent=question;$('#scene-number').textContent=String(target+1).padStart(2,'0')+' / 06';$('.scene-place').textContent=place;$('.scene-player').dataset.step=String(target);document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.scene===target)))}catch(error){if(request===sceneRequest)requestedScene=sceneIndex;console.warn('Storyboard image could not load',error)}finally{if(request===sceneRequest)$('.scene-player').setAttribute('aria-busy','false')}}
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>showScene(+b.dataset.scene));$('#scene-prev').onclick=()=>showScene(requestedScene-1);$('#scene-next').onclick=()=>showScene(requestedScene+1);
const making=[
 ['PRESENCE → REFLECTION','The screen becomes the mirror.','The original proposal imagined a touch-sensitive mirror with LED lighting and a camera. This version uses a mirrored live camera feed that fills the screen, with processing kept on your device.','Camera','Your reflection'],
 ['GESTURE → CONDENSATION','A breath changes the surface.','A sustained rounded-lip gesture is estimated from face landmarks. It grows a layer of mist near the mouth. Uneven moisture, beads and slow rivulets soften the reflected image. This is a visual estimate of blowing, not a physical breath sensor.','Mouth gesture','A misted surface'],
 ['MOVEMENT → LIGHT','Your fingertip is the wand.','Hand landmarks locate an extended index fingertip. Its position is smoothed into a travelling light, with a broader soft brush that uncovers the hidden handwriting. A pointer alternative works without a camera.','Index fingertip','A travelling light'],
 ['LIGHT → DISCOVERY','The words were waiting for you.','The messages are authored invitations to kindness, reflection and connection. Your light reveals their handwritten strokes by clearing the condensation: the reflection underneath becomes the letters. A new breath can begin another encounter.','Cleared mist','A kind message']
];
document.querySelectorAll('[data-making]').forEach(b=>b.onclick=()=>{const i=+b.dataset.making,m=making[i];['making-label','making-title','making-copy','signal-in','signal-out'].forEach((id,j)=>$('#'+id).textContent=m[j]);document.querySelectorAll('[data-making]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});

// A single illuminated work surface, with the original records kept intact.
const deskRecords=[...document.querySelectorAll('.archive-sheet')];
function selectDesk(index){deskRecords.forEach((sheet,i)=>{sheet.hidden=i!==index});document.querySelectorAll('[data-desk]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.desk===index)));}
document.querySelectorAll('[data-desk]').forEach(b=>b.onclick=()=>selectDesk(+b.dataset.desk));selectDesk(0);

archive.push(...[3,1,4,2].map((n,i)=>({title:'Original 3D design study '+(i+1),image:'render-'+n+'.jpg',kind:'ARTIST’S ORIGINAL 3D VISUALISATION / 2024',caption:'YongHong Chen’s original concept visualisation for the Magic Artist Mirror. The annotations document the proposed physical system; this is a design rendering.'})));setTorch(true,true);explorePage(pointer);

$('#sensing-retry').onclick=async()=>{const b=$('#sensing-retry');b.disabled=true;try{face?.close();hand?.close();face=null;hand=null;sensing=false;await setupSensing()}catch(e){$('#camera-status').textContent='Gesture tracking could not start. Please reload and open the camera again.'}finally{b.disabled=false}};
