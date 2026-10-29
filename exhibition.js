const sample=document.querySelector('#genesis-audio'),fullAudio=document.querySelector('#composition'),frame=document.querySelector('.moving-frame'),begin=document.querySelector('#begin-listening'),play=document.querySelector('#sample-play'),seek=document.querySelector('#sample-seek'),timeLabel=document.querySelector('#sample-time'),caption=document.querySelector('#cue-caption'),state=document.querySelector('#live-state'),note=document.querySelector('#sound-note'),art=document.querySelector('#sound-art'),wave=document.querySelector('#real-waveform');
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,ctx=art.getContext('2d'),wctx=wave.getContext('2d');
const sampleReady=fetch(sample.src).then(r=>{if(!r.ok)throw new Error('Audio unavailable');return r.blob()}).then(blob=>{sample.src=URL.createObjectURL(blob);sample.load();return new Promise(resolve=>{if(sample.readyState>=1)resolve();else sample.addEventListener('loadedmetadata',resolve,{once:true})})});
let context,analyser,data,peaks=[],envelope=[],energy=0,lastTime=0,hiddenAt=null;
let soundEvents=[];
const cueReady=fetch('assets/opening-cues.json').then(r=>{if(!r.ok)throw new Error('Cue sheet unavailable');return r.json()}).then(j=>{soundEvents=j.events.map(e=>({...e,id:e.visualId}));update()});
function isActive(id,t){return soundEvents.some(e=>e.id===id&&t>=e.start&&t<e.end)}
function initialiseAudio(){if(context)return;try{context=new AudioContext();const source=context.createMediaElementSource(sample);analyser=context.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.85;source.connect(analyser);analyser.connect(context.destination);data=new Uint8Array(analyser.frequencyBinCount)}catch(e){console.info('Using the recording’s precomputed amplitude envelope.')}}
async function start(){await Promise.all([sampleReady,cueReady]);initialiseAudio();if(context?.state==='suspended')await context.resume();fullAudio.pause();try{await sample.play();document.querySelector('#sample-status').textContent=''}catch(e){document.querySelector('#sample-status').textContent='Playback could not start. Please press play again.'}}
function pause(){sample.pause()}
function toggle(){if(sample.ended)sample.currentTime=0;sample.paused?start():pause()}
begin.addEventListener('click',start);play.addEventListener('click',toggle);
sample.addEventListener('play',()=>{begin.hidden=true;begin.style.display='none';play.textContent='Ⅱ';play.setAttribute('aria-label','Pause opening soundscape');state.textContent='LISTENING';});
sample.addEventListener('pause',()=>{play.textContent='▶';play.setAttribute('aria-label','Play opening soundscape');state.textContent=sample.ended?'STUDY COMPLETE':'PAUSED'});
sample.addEventListener('ended',()=>{state.textContent='STUDY COMPLETE';caption.textContent='The beginning continues. Replay, or explore the full composition below.'});
sample.addEventListener('error',()=>{document.querySelector('#sample-status').textContent='The opening recording could not load. The full composition is available below.'});
fullAudio.addEventListener('play',pause);
function format(t){return '00:'+String(Math.floor(t)).padStart(2,'0')}
function update(){const t=sample.currentTime;seek.value=t;timeLabel.textContent=format(t)+' / 00:31';document.querySelector('#wave-playhead').style.left=Math.min(100,t/31*100)+'%';const active=soundEvents.filter(e=>t>=e.start&&t<e.end);if(!sample.ended)caption.textContent='NOW HEARD: '+active.map(e=>e.label).join(' · ');document.querySelectorAll('[data-cue]').forEach(b=>{const on=isActive(b.dataset.sound,t);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));b.removeAttribute('aria-current')});drawWave()}
sample.addEventListener('timeupdate',update);sample.addEventListener('seeked',update);
seek.addEventListener('input',()=>{sample.currentTime=Number(seek.value);update()});
document.querySelectorAll('[data-cue]').forEach(b=>b.addEventListener('click',async()=>{await sampleReady;sample.currentTime=Number(b.dataset.cue);update();start()}));
document.querySelector('#sample-replay').addEventListener('click',()=>{sample.currentTime=0;update();start()});
document.querySelector('#sample-mute').addEventListener('click',e=>{sample.muted=!sample.muted;e.currentTarget.textContent=sample.muted?'Sound off':'Sound on';e.currentTarget.setAttribute('aria-label',sample.muted?'Unmute audio':'Mute audio')});
document.querySelector('.wave-track').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();sample.currentTime=Math.max(0,Math.min(31,(e.clientX-r.left)/r.width*31));update()});
let resumeAfterNote=false;
document.querySelectorAll('.specimen-note').forEach(b=>b.addEventListener('click',()=>{resumeAfterNote=!sample.paused;sample.pause();note.showModal()}));
document.querySelector('.note-close').addEventListener('click',()=>note.close());
note.addEventListener('close',()=>{if(resumeAfterNote)start();resumeAfterNote=false});
function sizeCanvas(canvas){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);return {w:r.width,h:r.height,dpr}}
function drawWave(){const {w,h,dpr}=sizeCanvas(wave);wctx.setTransform(dpr,0,0,dpr,0,0);wctx.clearRect(0,0,w,h);if(!peaks.length)return;const duration=323.28964583333334;const count=Math.ceil(31/duration*peaks.length);for(let i=0;i<count;i++){const x=i/count*w,amp=Math.pow(peaks[i],.7)*(h*.37);wctx.strokeStyle=x/w<sample.currentTime/31?'#008881':'#154cb480';wctx.lineWidth=Math.max(1,w/count*.5);wctx.beginPath();wctx.moveTo(x,h*.48-amp);wctx.lineTo(x,h*.48+amp);wctx.stroke()}}
fetch('assets/sound-envelope.json').then(r=>r.json()).then(j=>{peaks=j.peaks;envelope=j.rms;drawWave()}).catch(()=>{});
let W=1,H=1,D=1;function resizeArt(){const s=sizeCanvas(art);W=s.w;H=s.h;D=s.dpr;drawWave()}
new ResizeObserver(resizeArt).observe(frame);resizeArt();
const images={};for(const key of ['forest','fire','bird','water','stream']){const img=new Image();img.src='assets/user-media/'+key+'.jpg';images[key]=img}
const low=document.createElement('canvas');low.width=256;low.height=144;const lowCtx=low.getContext('2d',{willReadFrequently:true});
const glyphs='01+×∴:<>/\\#~';
function cover(c,img,x,y,w,h){const iw=img.videoWidth||img.naturalWidth,ih=img.videoHeight||img.naturalHeight;if(!iw||!ih)return;const scale=Math.max(w/iw,h/ih),sw=w/scale,sh=h/scale;c.drawImage(img,(iw-sw)/2,(ih-sh)/2,sw,sh,x,y,w,h)}
let lastDraw=0,pixelData;
function render(now){requestAnimationFrame(render);if(document.hidden||now-lastDraw<40)return;lastDraw=now;
 const t=sample.currentTime,playing=!sample.paused&&!sample.ended;let measured=0;if(playing){if(analyser){analyser.getByteFrequencyData(data);measured=data.reduce((a,b)=>a+b,0)/data.length/255}else if(envelope.length)measured=envelope[Math.min(envelope.length-1,Math.floor(t/323.28964583333334*envelope.length))]*3}
 energy+=(measured-energy)*.18;const motionTime=reduced?0:t;
 lowCtx.clearRect(0,0,256,144);const drift=reduced?0:Math.sin(t*.09)*3;cover(lowCtx,images.forest,-3+drift,-2,262,148);
 // Opening visual layers follow the verified sound-event intervals; later storm footage is excluded.
 if(isActive('water',t)){lowCtx.globalAlpha=.45;cover(lowCtx,images.stream,128,60,128,84);lowCtx.globalAlpha=1}
 try{pixelData=lowCtx.getImageData(0,0,256,144);for(let i=0;i<pixelData.data.length;i+=4){const d=pixelData.data,l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];d[i]=12+l*.45;d[i+1]=28+l*.64;d[i+2]=64+l*.74}lowCtx.putImageData(pixelData,0,0)}catch(e){}
 ctx.setTransform(D,0,0,D,0,0);ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.drawImage(low,0,0,W,H);
 // Photographic fragments are clipped into irregular paper-like silhouettes.
 if(images.fire.complete&&isActive('fire',t)){ctx.save();ctx.beginPath();ctx.moveTo(W*.08,H*.35);ctx.lineTo(W*.30,H*.28);ctx.lineTo(W*.43,H*.69);ctx.lineTo(W*.35,H*.91);ctx.lineTo(W*.08,H*.82);ctx.closePath();ctx.clip();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.48+energy*.6;cover(ctx,images.fire,W*.03,H*.23,W*.44,H*.73);ctx.restore()}
 if(isActive('birds',t)&&images.bird.complete){ctx.save();ctx.beginPath();ctx.ellipse(W*.76,H*.36,W*.13,H*.23,-.12,0,Math.PI*2);ctx.clip();ctx.globalAlpha=.6;ctx.filter='grayscale(1) contrast(1.4)';cover(ctx,images.bird,W*.62,H*.1,W*.28,H*.48);ctx.restore()}
 // Pixel islands and character-shaped cutouts sample the actual moving video.
 const cell=Math.max(10,W/70),rows=Math.ceil(H/cell),cols=Math.ceil(W/cell),tick=Math.floor(motionTime*3);
 ctx.font=`${Math.max(8,cell*.78)}px 'Space Mono',monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
 for(let row=0;row<rows;row++){for(let col=0;col<cols;col++){const x=col*cell,y=row*cell,nx=x/W,ny=y/H,px=Math.min(255,Math.floor(nx*256)),py=Math.min(143,Math.floor(ny*144)),i=(py*256+px)*4;const d=pixelData?.data;if(!d)continue;const noise=(Math.sin(col*12.9898+row*78.233)*43758.5453)%1,band=Math.sin(nx*10+ny*6+motionTime*.32);const bright=(d[i]+d[i+1]+d[i+2])/765;
   if(band>.58&&Math.abs(noise)<.37+energy*.6){ctx.fillStyle=`rgba(${Math.round(d[i])},${Math.round(d[i+1])},${Math.round(d[i+2])},.94)`;ctx.fillRect(x,y,cell+1,cell+1);ctx.fillStyle='#a5d9ee66';if((col+row)%3===0)ctx.fillText(glyphs[(col*7+row*3+tick)%glyphs.length],x+cell/2,y+cell/2)}
   const patch=Math.pow((nx-.40)/.14,2)+Math.pow((ny-.57)/.20,2)<1||Math.pow((nx-.68)/.10,2)+Math.pow((ny-.77)/.17,2)<1;
   if(patch&&((col*3+row*5)%7<4)&&bright>.24){ctx.fillStyle='#eeede4';ctx.beginPath();ctx.arc(x+cell*.5,y+cell*.5,cell*.74,0,Math.PI*2);ctx.fill();ctx.fillStyle='#143c78';ctx.fillText(glyphs[(col+row*11+tick)%glyphs.length],x+cell*.5,y+cell*.5)}
 }}
 // Frequency ribbons and tracking marks run through the picture, not as a separate visualiser.
 ctx.lineWidth=.8;for(let j=0;j<3;j++){ctx.strokeStyle=j===0?'#83e3d2bb':'#d4e5e766';ctx.beginPath();for(let x=0;x<W;x+=6){const yy=H*(.50+j*.06)+Math.sin(x/W*10+motionTime*.7+j)*(6+energy*65);x?ctx.lineTo(x,yy):ctx.moveTo(x,yy)}ctx.stroke()}
 ctx.strokeStyle='#abd9f31a';for(let y=0;y<H;y+=4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 ctx.strokeStyle='#d4edff88';ctx.setLineDash([2,7]);ctx.beginPath();ctx.moveTo(W*.12,0);ctx.lineTo(W*.12,H);ctx.moveTo(0,H*.23);ctx.lineTo(W,H*.23);ctx.stroke();ctx.setLineDash([]);
 ctx.textAlign='left';ctx.font=`${Math.max(8,W*.009)}px 'Space Mono',monospace`;ctx.fillStyle='#e8f4ee';ctx.fillText(`FIELD // ${t.toFixed(2).padStart(5,'0')}   SIGNAL ${Math.round(energy*100).toString().padStart(2,'0')}`,W*.03,H*.06);
}
requestAnimationFrame(render);update();
