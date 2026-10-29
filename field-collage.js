// Artist-supplied archive, curated by narrative phase. No new soundtrack is synthesised.
let entries=[],pictures={},weather=null,weatherReady=false,archiveResume=false,selection=[],selectionIndex=0;
const transitions=new Map();
const $=s=>document.querySelector(s),id=n=>'p'+String(n).padStart(2,'0');
const collectionInfo={discarded:['Collected waste','Three field photographs of cans, packaging and discarded objects.'],process:['Photograph → data → sound','Three surviving captures of GeoImgr, TwoTone and p5.js.'],installation:['Cans, trees and weather','One making photograph and two field-video studies of the installation.'],recording:['Recording in the field','Two recording photographs and a storm-river excerpt.']};
const curated={discarded:['p14','p19','p01'],process:['p33','p34','p35'],installation:['p32','v-cans','v-weather'],recording:['p20','p69','v-river']};

export const archiveReady=fetch('assets/field-archive/manifest.json').then(r=>r.json()).then(items=>{entries=items;for(const e of items){if(e.type==='video')continue;const i=new Image();i.decoding='async';i.dataset.source=e.src;pictures[e.id]=i}buildExhibit();return items});
function picture(number){const image=pictures[id(number)];if(image&&!image.getAttribute('src'))image.src=image.dataset.source;return image}
export function pauseArchiveMotion(){if(weather&&!weather.paused)weather.pause()}
function cover(c,img,x,y,w,h){const iw=img?.videoWidth||img?.naturalWidth,ih=img?.videoHeight||img?.naturalHeight;if(!iw||!ih)return;const scale=Math.max(w/iw,h/ih),sw=w/scale,sh=h/scale;c.drawImage(img,(iw-sw)/2,(ih-sh)/2,sw,sh,x,y,w,h)}
function outline(c,w,h,shape){c.beginPath();const points=shape==='strip'?[[.06,0],[1,.04],[.95,.94],[0,1],[.03,.51]]:[[0,.1],[.39,0],[.97,.08],[1,.68],[.85,1],[.05,.92],[.09,.43]];points.forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.closePath()}
function fragment(c,img,slot,W,H,time,reduced,raw=false,mood=0){if(!img||(img.readyState!==undefined?img.readyState<2:!img.complete))return;const [x,y,w,h,angle,shape]=slot,drift=reduced?0:Math.sin(time*(mood===3?.25:.12)+x*13)*H*(mood===3?.013:.006);c.save();c.translate(x*W+w*W/2,y*H+h*H/2+drift);c.rotate(angle+(reduced?0:Math.sin(time*.13+x*7)*.016));c.translate(-w*W/2,-h*H/2);const fw=w*W,fh=h*H;c.globalAlpha*=raw?1:(mood===0?.7:mood===5?.62:.9);
 outline(c,fw,fh,shape);c.save();c.shadowColor='#03172c66';c.shadowBlur=16;c.fillStyle='#d7e5e6';c.fill();c.restore();c.clip();cover(c,img,0,0,fw,fh);
 if(!raw){const opacity=c.globalAlpha;c.fillStyle=mood===5?'#b1cdd0':'#4b8baa';c.globalAlpha=opacity*.22;c.fillRect(0,0,fw,fh);c.globalAlpha=opacity*.13;c.fillStyle='#c4e9ef';for(let y=0;y<fh;y+=5)c.fillRect(0,y,fw,.5);c.globalAlpha=opacity*.18;c.fillStyle='#092d54';for(let x=0;x<fw;x+=fw/9)c.fillRect(x,0,.6,fh);
 if(mood===4){c.globalAlpha=opacity*.15;for(let y=0;y<fh;y+=fh/7){const shift=Math.sin(time*1.4+y)*fw*.06;cover(c,img,shift,y,fw,fh/10)}}}c.restore()}

const sequences=[
 [{ids:[27,62,31,24],slot:[.015,.13,.27,.44,-.075,'strip']},{ids:[45,66,61],slot:[.72,.11,.25,.38,.05,'cut']}],
 [{ids:[3,6,22,56,44,46],slot:[.015,.14,.28,.43,-.06,'cut']},{ids:[9,25,26,38,57,48],slot:[.68,.11,.29,.46,.065,'strip']},{ids:[52,61,67,24,28,29],slot:[.23,.43,.27,.28,.035,'strip']}],
 [{ids:[10,13,14,16,23,19],slot:[.01,.15,.32,.50,-.07,'cut']},{ids:[12,15,8,11,1],slot:[.65,.10,.32,.46,.07,'strip']},{ids:[65,50,58,37,49],slot:[.36,.37,.34,.34,-.05,'cut']}],
 [{ids:[53,36,39,55],slot:[.005,.11,.36,.49,-.065,'cut']},{ids:[58,50,37,40,55],slot:[.68,.08,.31,.56,.065,'strip']},{ids:[14,1,13,23,49],slot:[.28,.42,.31,.28,.035,'strip']}],
 [{ids:[51,47,63,54],slot:[.015,.12,.39,.56,-.09,'cut']},{ids:[60,51,54,47],slot:[.66,.11,.32,.43,.08,'strip']},{ids:[14,37,1],slot:[.35,.43,.25,.24,-.04,'cut']}],
 [{ids:[18,17,64,43],slot:[.04,.20,.32,.38,-.045,'strip']},{ids:[45,30,28],slot:[.72,.14,.24,.37,.055,'cut']}]
];

function stage(t){return t<64?0:t<105?1:t<163?2:t<258?3:t<291?4:5}
const starts=[0,64,105,163,258,291];
export function drawCollage(ctx,raw,{time,W,H,reduced,energy,audio}){
 const p=stage(time),period=[15,7,6.5,5.5,4.5,12][p],cycle=Math.floor((time-starts[p])/period);drawAtmosphere(ctx,{time,W,H,reduced,energy,p});
 let layers=sequences[p];const installation=time>=186&&time<226;
 if(installation)layers=[{ids:[4,32],slot:[.015,.12,.32,.51,-.06,'strip']},{ids:[1,14,16,13],slot:[.70,.08,.28,.47,.08,'cut']}];
 const dataStudy=(time>=141&&time<163)||(time>=175&&time<186)||(time>=225&&time<237);if(dataStudy)layers=[...layers,{ids:[33,34,35],slot:[.34,.12,.32,.23,.035,'strip']}];
 for(const [n,layer] of layers.entries()){
  picture(layer.ids[(cycle+n+1)%layer.ids.length]);const currentId=layer.ids[(cycle+n)%layer.ids.length],transitionKey=p+'-'+n,stamp=performance.now();if(transitions.get(transitionKey)?.id!==currentId)transitions.set(transitionKey,{id:currentId,at:stamp});const current=picture(currentId),previous=picture(layer.ids[((Math.max(0,cycle-1))+n)%layer.ids.length]),opacity=reduced?1:Math.min(1,(stamp-transitions.get(transitionKey).at)/([1500,1100,850,700,650,1800][p]));
  if(opacity<1&&cycle>0){fragment(ctx,previous,layer.slot,W,H,time,reduced,false,p);fragment(raw,previous,layer.slot,W,H,time,reduced,true,p)}
  ctx.save();raw.save();ctx.globalAlpha=opacity;raw.globalAlpha=opacity;
  fragment(ctx,current,animateSlot(layer.slot,p,cycle),W,H,time,reduced,false,p);fragment(raw,current,animateSlot(layer.slot,p,cycle),W,H,time,reduced,true,p);ctx.restore();raw.restore();
 }
 if(installation){syncWeather(audio,time,reduced);if(weatherReady){const slot=[.42,.30,.35,.38,-.035,'strip'];fragment(ctx,weather,slot,W,H,time,reduced,false,p);fragment(raw,weather,slot,W,H,time,reduced,true,p)}}else if(weather&&!weather.paused)weather.pause();
 // Editorial connecting lines are a visual interpretation, never plotted coordinates or MIDI values.
 ctx.save();ctx.strokeStyle='#bceee4aa';ctx.lineWidth=.8;ctx.setLineDash([3,5]);const points=p===2?[[.15,.35],[.49,.15],[.78,.36]]:[[.18,.32],[.54,.25],[.8,.4]];ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*W,y*H):ctx.moveTo(x*W,y*H));ctx.stroke();ctx.setLineDash([]);for(const [x,y] of points){ctx.beginPath();ctx.arc(x*W,y*H,3+energy*4,0,Math.PI*2);ctx.stroke()}
 ctx.font=`${Math.max(7,Math.min(10,W/95))}px 'Space Mono',monospace`;ctx.fillStyle='#e5f4e9';ctx.textAlign='left';ctx.textBaseline='top';
 const note=(p===2||dataStudy)?'DISCARDED OBJECT → PHOTOGRAPH → DATA → SOUND':installation?'CANS / TREE / WIND — INSTALLATION STUDY':p===3?'HUMAN WASTE × NATURAL FORCE':p===4?'FRAGMENTS / CONSCIENCE / MEMORY':p===5?'RECONNECTION IS STILL A QUESTION':'LIVING SYSTEMS / FIELD NOTES';
 ctx.fillStyle='#082d4fcc';const labelW=Math.min(W*.87,note.length*(W<600?4.2:5.6)+20);ctx.fillRect(W*.05,Math.max(46,H*.08),labelW,24);ctx.fillStyle='#d3efe7';ctx.fillText(note,W*.05+10,Math.max(46,H*.08)+8);ctx.restore();
}
function animateSlot(slot,p,cycle){const s=[...slot];if(cycle%2===1&&p>0&&p<5){s[0]=Math.max(.01,Math.min(.73,s[0]+(s[0]<.4?.025:-.025)));s[1]+=.025;s[4]*=-.65}return s}
function drawAtmosphere(c,{time,W,H,reduced,energy,p}){
 const clock=reduced?0:time;c.save();
 // Low-frequency fog and a moving light field preserve the depth of the landscape.
 const cx=W*(.48+Math.sin(clock*.07)*.18),cy=H*(p===5?.58:.38),glow=c.createRadialGradient(cx,cy,0,cx,cy,W*.7);
 glow.addColorStop(0,p===3?'#257da64a':p===4?'#09244030':p===5?'#d8e5d04d':'#85d3c62b');glow.addColorStop(1,'#05264400');c.fillStyle=glow;c.fillRect(0,0,W,H);
 if(p<2||p===5){for(let layer=0;layer<3;layer++){const y=H*(.22+layer*.2)+Math.sin(clock*.05+layer)*H*.05;const fog=c.createLinearGradient(0,y-H*.08,0,y+H*.09);fog.addColorStop(0,'#afded600');fog.addColorStop(.5,p===5?'#c9e6dc20':'#b4e9de15');fog.addColorStop(1,'#afded600');c.fillStyle=fog;c.fillRect(0,y-H*.08,W,H*.17)}
  c.fillStyle='#cff7e5';for(let i=0;i<26;i++){const x=(i*.381966+Math.sin(clock*.035+i)*.035)%1*W,y=((i*.618034-clock*.004)%1+1)%1*H;c.globalAlpha=.12+Math.sin(i+clock*.3)**2*.2;c.beginPath();c.arc(x,y,i%3===0?1.8:.8,0,Math.PI*2);c.fill()}}
 if(p===2){c.globalAlpha=.1+energy*.18;c.strokeStyle='#a0ece2';for(let i=0;i<7;i++){const y=((i/7+clock*.018)%1)*H;c.beginPath();c.moveTo(0,y);c.lineTo(W,y-12*Math.sin(clock*.4+i));c.stroke()}}
 if(p===3){c.globalAlpha=.12+energy*.18;c.strokeStyle='#b5ebee';c.lineWidth=.8;for(let i=0;i<60;i++){const x=((i*.381966+clock*.04)%1)*W,y=((i*.618034+clock*.32)%1)*H;c.beginPath();c.moveTo(x,y);c.lineTo(x-W*.018,y+H*.065);c.stroke()}
  c.globalAlpha=.1;c.strokeStyle='#dbf8f1';for(let j=0;j<4;j++){c.beginPath();for(let x=0;x<=W;x+=12){const y=H*(.2+j*.13)+Math.sin(x/W*5+clock*.35+j)*H*.06;x?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}}
 if(p===4){c.globalAlpha=.09+energy*.08;c.fillStyle='#061b32';for(let i=0;i<9;i++){const y=H*((i/9+clock*.018)%1);c.fillRect(0,y,W,H*.015)}c.strokeStyle='#b4d8dc';c.globalAlpha=.22;c.setLineDash([2,8]);for(let j=0;j<3;j++){const x=W*(.25+j*.24)+Math.sin(clock*.4+j)*W*.035;c.beginPath();c.moveTo(x,H*.07);c.lineTo(x-W*.06,H*.73);c.stroke()}}
 c.restore();
}
function syncWeather(audio,time,reduced){
 if(!weather){weather=$('#cans-weather');weather.muted=true;weather.addEventListener('loadeddata',()=>weatherReady=true,{once:true});weather.preload='auto';weather.load()}
 if(!weatherReady||weather.seeking)return;
 const target=(time-186)%Math.max(.1,weather.duration-.05);
 if(Math.abs(weather.currentTime-target)>.5)weather.currentTime=target;
 if(!audio.paused&&!reduced&&weather.paused)weather.play().catch(()=>{});
 if(audio.paused&&!weather.paused)weather.pause();
}
function buildExhibit(){for(const [key,[title,description]] of Object.entries(collectionInfo)){const list=curated[key].map(id=>entries.find(e=>e.id===id));const b=document.createElement('button');b.className='archive-card';const coverItem=list.find(e=>e.type!=='video');b.innerHTML=`<img src="${coverItem.src}" alt="" loading="lazy"><span>${String(Object.keys(collectionInfo).indexOf(key)+1).padStart(2,'0')} / ${list.length} SELECTED RECORDS</span><h3>${title}</h3><p>${description}</p><small>Open the archive ↗</small>`;b.onclick=()=>openArchive(list,0);$('#archive-cards').append(b)}
 $('#archive-zoom').onclick=()=>{const on=$('.archive-media').classList.toggle('zoomed');$('#archive-zoom').setAttribute('aria-pressed',String(on));$('#archive-zoom').textContent=on?'Fit document':'Enlarge document'};
 $('#archive-prev').onclick=()=>showArchive(selectionIndex-1);$('#archive-next').onclick=()=>showArchive(selectionIndex+1);$('#archive-close').onclick=()=>$('#archive').close();$('#archive').addEventListener('close',()=>{$('#archive-video').pause();if(archiveResume)$('#play').click();archiveResume=false});$('#archive').addEventListener('keydown',e=>{if(e.target.tagName==='VIDEO')return;if(e.key==='ArrowRight'){e.preventDefault();showArchive(selectionIndex+1)}if(e.key==='ArrowLeft'){e.preventDefault();showArchive(selectionIndex-1)}});
}
function openArchive(list,index){const a=$('#composition');archiveResume=!a.paused;if(archiveResume)$('#play').click();selection=list;showArchive(index);$('#archive').showModal()}
function showArchive(index){selectionIndex=(index+selection.length)%selection.length;const e=selection[selectionIndex];$('#archive').classList.toggle('process-record',e.group==='process');$('.archive-media').classList.remove('zoomed');$('#archive-zoom').hidden=e.group!=='process';$('#archive-zoom').setAttribute('aria-pressed','false');$('#archive-zoom').textContent='Enlarge document';$('#archive-count').textContent=`${selectionIndex+1} / ${selection.length} — ${collectionInfo[e.group][0]}`;$('#archive-title').textContent=e.title;$('#archive-caption').textContent=e.origin;$('#archive-file').textContent=e.original;const image=$('#archive-image'),video=$('#archive-video');video.pause();image.hidden=e.type==='video';video.hidden=e.type!=='video';if(e.type==='video'){video.src=e.src;video.load()}else{image.src=e.src;image.alt=e.title}$('#archive-note').textContent=e.group==='process'?'Surviving process captures document how photograph locations and object counts were translated into musical material. The exhibition follows this process alongside the finished composition; it does not regenerate the original mapping.':e.group==='pressure'?'Reference imagery used as visual metaphor; distinct from the artist’s field documentation.':e.type==='video'?'Field-video excerpt. The main composition pauses while you explore.':''}
