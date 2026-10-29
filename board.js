import * as T from './vendor/three/three.module.js';
import {overlaps2D,resolvePaperStack} from './paper-stack.mjs';
const $=s=>document.querySelector(s), canvas=$('#scene'),stage=$('#stage');
const hint=document.createElement('div');hint.className='board-hint';hint.hidden=true;stage.append(hint);
const section=location.pathname.includes('playground')?'playground':location.pathname.includes('commercial')?'commercial':'research';
const collections=await fetch('./projects.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Project index unavailable');return r.json();});
// Featured entries stay on the board; remaining spaces are filled by latest updates.
const allProjects=collections[section].map((entry,order)=>({entry,order,updatedAt:entry[4]||null,featuredRank:Number.isInteger(entry[5])?entry[5]:Infinity})).sort((a,b)=>a.featuredRank-b.featuredRank||(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0)||a.order-b.order);
const projects=allProjects.slice(0,7).map(p=>p.entry);
const archived=allProjects.slice(7).map(p=>p.entry);
const row=p=>p[3]?`<a href="${p[3]}">${p[0]} ↗<small>${p[1]}${p[4]?' · Updated '+p[4]:''}</small></a>`:`<div class="placeholder">${p[0]}<small>${p[1]}</small></div>`;
$(`[data-section="${section}"]`).setAttribute('aria-current','page');
$('#subtitle').textContent={research:'Research, questions & discoveries.',playground:'Small experiments. Strange possibilities.',commercial:'Creative work, collected case by case.'}[section];
$('#project-list').innerHTML=`<p class="collection-note">${projects.length} ON THE BOARD · ${section==='commercial'?'FEATURED & RECENT WORK':'UP TO 7 MOST RECENTLY UPDATED'}</p>${projects.map(row).join('')}${archived.length?`<details class="archive"><summary>More projects (${archived.length})</summary>${archived.map(row).join('')}</details>`:'<p class="collection-note">Earlier projects will be collected here when the board reaches seven.</p>'}`;
$('#list').textContent=archived.length?`More projects (${archived.length}) ↗`:`Project index (${projects.length}) ↗`;
$('#list').onclick=()=>$('#projects').showModal();$('#close').onclick=()=>$('#projects').close();
let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true});}catch(e){$('#status').textContent='3D is unavailable on this device. Open the project list below.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.VSMShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
const scene=new T.Scene();scene.background=new T.Color('#f1efe9');const camera=new T.PerspectiveCamera(35,1,.1,100);camera.position.set(0,.1,15);camera.lookAt(0,0,0);
scene.add(new T.AmbientLight(0xe1e8ff,1.85));const lamp=new T.SpotLight(0xffe5ba,30,25,.9,.65,1.1);lamp.position.set(-4,4.5,4);lamp.target.position.set(0,0,0);lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);lamp.shadow.radius=4;lamp.shadow.blurSamples=12;lamp.shadow.bias=-.0002;lamp.shadow.normalBias=.02;scene.add(lamp,lamp.target);
const fill=new T.DirectionalLight(0xd7e5ff,1.35);fill.position.set(4,2,5);scene.add(fill);
function texture(kind){const c=document.createElement('canvas');c.width=c.height=1024;const x=c.getContext('2d');x.fillStyle=kind==='wood'?'#d7d0bd':'#bcad8c';x.fillRect(0,0,1024,1024);let seed=71;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};for(let i=0;i<(kind==='wood'?9000:100000);i++){const a=rand()*1024,b=rand()*1024;x.fillStyle=`rgba(${rand()>.5?'255,230,169':'38,23,9'},${rand()*.08})`;x.fillRect(a,b,kind==='wood'?30+rand()*160:1+rand()*5,1+rand()*3);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
function box(w,h,d,mat,x,y,z){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m;}
const cork=texture('cork'),wood=texture('wood');box(10.65,6.35,.24,new T.MeshStandardMaterial({map:wood,roughness:.75}),0,0,-.18);box(10.2,5.9,.09,new T.MeshStandardMaterial({map:cork,bumpMap:cork,bumpScale:.015,roughness:1}),0,0,-.025);
const frameMat=new T.MeshStandardMaterial({color:0xe7e7df,roughness:.52,metalness:.08});box(10.7,.18,.25,frameMat,0,3.08,.04);box(10.7,.18,.25,frameMat,0,-3.08,.04);box(.18,6.2,.25,frameMat,-5.25,0,.04);box(.18,6.2,.25,frameMat,5.25,0,.04);
box(13,.22,2.1,new T.MeshStandardMaterial({color:0xe2e1d9,roughness:.6}),0,-3.55,.1).castShadow=false;
// A blurred ambient shadow replaces the hard, distant silhouette on the wall.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=1024;shadowCanvas.height=768;const shadowContext=shadowCanvas.getContext('2d');shadowContext.filter='blur(48px)';shadowContext.fillStyle='rgba(45,62,86,.16)';shadowContext.fillRect(180,140,660,450);const ambientShadow=new T.CanvasTexture(shadowCanvas);
const backdrop=new T.Mesh(new T.PlaneGeometry(16,12),new T.MeshBasicMaterial({map:ambientShadow,transparent:true,depthWrite:false}));backdrop.position.set(.5,-.4,-.65);backdrop.receiveShadow=false;scene.add(backdrop);
// Studio reflections give the chrome its alternating bright and dark bands.
const reflectionFaces=Array.from({length:6},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,256,0);g.addColorStop(0,'#6c7481');g.addColorStop(.2,'#f9fafb');g.addColorStop(.34,'#c9ced6');g.addColorStop(.43,'#424c5a');g.addColorStop(.53,'#f8f9fb');g.addColorStop(.72,'#e8e8e3');g.addColorStop(1,'#7c8798');x.fillStyle=g;x.fillRect(0,0,256,256);x.fillStyle=i===2?'#ffffff':'#eef2f866';x.fillRect(18,0,30,256);return c;});
const reflectionCube=new T.CubeTexture(reflectionFaces);reflectionCube.needsUpdate=true;reflectionCube.colorSpace=T.SRGBColorSpace;const pmrem=new T.PMREMGenerator(renderer);const chromeEnvironment=pmrem.fromCubemap(reflectionCube).texture;pmrem.dispose();
const silver=new T.MeshPhysicalMaterial({color:0xe4e8ef,metalness:1,roughness:.21,envMap:chromeEnvironment,envMapIntensity:1.1});
const brushed=new T.MeshPhysicalMaterial({color:0xc1c7d0,metalness:.94,roughness:.32,envMap:chromeEnvironment,envMapIntensity:.95});
const blueEnamel=new T.MeshPhysicalMaterial({color:0x154cb4,metalness:.25,roughness:.21,clearcoat:1,clearcoatRoughness:.12,envMap:chromeEnvironment,envMapIntensity:.7,side:T.DoubleSide});
const inner=new T.MeshStandardMaterial({color:0xf6eed9,roughness:.58,side:T.DoubleSide});
const rubber=new T.MeshStandardMaterial({color:0x202833,roughness:.75});
function rod(a,b,r,mat){const d=new T.Vector3().subVectors(b,a),m=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),32),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());m.castShadow=true;scene.add(m);return m;}
function tube(points,r,mat){const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),64,r,16,false),mat);m.castShadow=true;scene.add(m);return m;}
// Square steel plinth with a lower seam and small side switch.
box(.98,.11,.82,brushed,-5.6,-3.43,1.15);
box(.96,.48,.8,brushed,-5.6,-3.145,1.15);
const switchMesh=new T.Mesh(new T.CylinderGeometry(.065,.065,.11,32),silver);switchMesh.rotation.z=Math.PI/2;switchMesh.position.set(-5.07,-3.13,1.32);scene.add(switchMesh);
rod(new T.Vector3(-5.6,-2.91,1.15),new T.Vector3(-5.6,-2.7,1.15),.105,brushed);
// One continuous chrome upright, bent into a short horizontal neck.
tube([new T.Vector3(-5.6,-2.83,1.15),new T.Vector3(-5.6,-.2,1.15),new T.Vector3(-5.6,2.15,1.15),new T.Vector3(-5.55,2.43,1.15),new T.Vector3(-5.35,2.59,1.15),new T.Vector3(-4.95,2.59,1.15)],.068,silver);
rod(new T.Vector3(-5.02,2.43,1.15),new T.Vector3(-5.02,2.86,1.15),.115,brushed);
rod(new T.Vector3(-4.98,2.59,1.15),new T.Vector3(-4.64,2.59,1.15),.077,silver);
const joint=new T.Mesh(new T.SphereGeometry(.135,32,20),silver);joint.position.set(-4.69,2.59,1.15);scene.add(joint);
const shadeGroup=new T.Group();shadeGroup.position.set(-4.24,2.24,1.35);shadeGroup.rotation.x=-.28;shadeGroup.rotation.z=.56;scene.add(shadeGroup);
const profile=[new T.Vector2(.77,-.22),new T.Vector2(.77,-.16),new T.Vector2(.75,.02),new T.Vector2(.68,.24),new T.Vector2(.54,.43),new T.Vector2(.34,.56),new T.Vector2(.15,.59)];
const shade=new T.Mesh(new T.LatheGeometry(profile,96),blueEnamel);shade.castShadow=true;shadeGroup.add(shade);
const lining=new T.Mesh(new T.LatheGeometry(profile.map(p=>new T.Vector2(p.x*.975,p.y-.012)),96),inner);shadeGroup.add(lining);
const rim=new T.Mesh(new T.TorusGeometry(.765,.014,12,96),blueEnamel);rim.rotation.x=Math.PI/2;rim.position.y=-.205;shadeGroup.add(rim);
const socket=new T.Mesh(new T.CylinderGeometry(.19,.19,.48,48),silver);socket.position.y=.81;socket.castShadow=true;shadeGroup.add(socket);
const bulb=new T.Mesh(new T.CircleGeometry(.717,64),new T.MeshBasicMaterial({color:0xffefd1,side:T.DoubleSide}));bulb.rotation.x=Math.PI/2;bulb.position.y=-.16;shadeGroup.add(bulb);
shadeGroup.updateMatrixWorld(true);const cableEnd=shadeGroup.localToWorld(new T.Vector3(0,1.06,0));
tube([new T.Vector3(-5.02,2.83,1.15),new T.Vector3(-5.05,3.13,1.13),new T.Vector3(-5.25,3.28,1.16),new T.Vector3(-5.04,3.55,1.2),new T.Vector3(-4.78,3.43,1.2),cableEnd],.035,rubber);
lamp.position.copy(shadeGroup.localToWorld(new T.Vector3(0,-.3,.1)));lamp.target.position.set(-.4,-.4,.1);
function commercialTexture(p,index){
 const c=document.createElement('canvas');c.width=768;c.height=672;const x=c.getContext('2d');x.fillStyle='#f6f3e9';x.fillRect(0,0,c.width,c.height);x.fillStyle='#154cb4';x.font='500 38px Arial';x.textAlign='center';
 x.font='18px monospace';x.fillStyle='#7183a3';x.fillText('CASE '+String(index+1).padStart(2,'0'),384,638);
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const img=new Image();img.onload=()=>{const scale=Math.min(698/img.width,405/img.height);x.drawImage(img,35+(698-img.width*scale)/2,35+(405-img.height*scale)/2,img.width*scale,img.height*scale);texture.needsUpdate=true;};img.src=p[2];return texture;
}
function cardTexture(p,index){
 if(section==='commercial')return commercialTexture(p,index);
 const c=document.createElement('canvas');c.width=1000;c.height=1200;const x=c.getContext('2d');const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
 function draw(img){
  x.fillStyle='#f6f3eb';x.fillRect(0,0,1000,1200);
  x.strokeStyle='#154cb440';x.lineWidth=2;x.beginPath();x.moveTo(60,125);x.lineTo(940,125);x.stroke();
  x.fillStyle='#154cb4';x.font='24px monospace';x.textAlign='left';x.fillText('0'+(index+1)+' / '+(section==='playground'?'INTERACTION STUDY':index===0?'SOUND & ECOLOGY':index===1?'DIGITAL HUMANITIES':'DATA & EMOTION'),60,89);
  if(section==='playground'){
   const g=x.createLinearGradient(130,170,850,920);g.addColorStop(0,'#a5bdd7');g.addColorStop(.28,'#f5f5ea');g.addColorStop(.48,'#d4e0ed');g.addColorStop(.8,'#7d9fca');g.addColorStop(1,'#e7ebe8');
   x.save();x.beginPath();x.roundRect(180,175,640,730,[290,290,20,20]);x.fillStyle=g;x.fill();x.strokeStyle='#718aab';x.lineWidth=12;x.stroke();
   x.fillStyle='#154cb4';x.textAlign='center';x.font='italic 62px Georgia';x.fillText('Leave a little',500,490);x.fillText('light behind.',500,565);x.lineWidth=3;x.strokeStyle='#ffffffb0';x.beginPath();x.moveTo(265,680);x.bezierCurveTo(380,560,440,835,680,650);x.stroke();x.restore();
  }else if(img){
   const w=880,h=735,px=60,py=165;const scale=Math.min(w/img.width,h/img.height);
   x.fillStyle=index===1?'#e7e9e1':'#e1e7e9';x.fillRect(px,py,w,h);x.drawImage(img,px+(w-img.width*scale)/2,py+(h-img.height*scale)/2,img.width*scale,img.height*scale);
   if(index===0){x.strokeStyle='#f1efe9c0';x.lineWidth=2;for(let n=0;n<13;n++){x.beginPath();for(let i=0;i<=110;i++){const px2=70+i*7.8,py2=720+n*8+Math.sin(i*.19+n*.42)*15;x.lineTo(px2,py2);}x.stroke();}}
  }
  x.fillStyle='#7990ad';x.font='21px monospace';x.textAlign='left';x.fillText(section==='playground'?'BREATH / TOUCH / LIGHT':index===0?'A COMPOSITION OF ENVIRONMENTAL SOUND':index===1?'THE WINDOW WITH THORNS':'AN EXISTING STUDY · OPEN ORIGINAL ↗',60,1140);
  t.needsUpdate=true;
 }
 draw(null);if(p[2]){const img=new Image();img.onload=()=>draw(img);img.src=p[2];}return t;
}
const cards=[],pins=[],pickables=[];const compact=projects.length>3,cardWidth=section==='commercial'?2:projects.length===1?3.1:2.6,cardHeight=section==='commercial'?1.75:projects.length===1?3.72:3.12,pinY=section==='commercial'?.68:projects.length===1?1.55:1.25;
const home=projects.length===1?[[.1,.15,-.04]]:compact?[[-3.65,1.45,-.07],[-1.2,1.35,.05],[1.25,1.45,-.06],[3.65,1.25,.07],[-2.65,-1.3,.06],[0,-1.35,-.04],[2.7,-1.3,.08]]:[[-3.1,.9,-.09],[.05,-.65,.08],[3.1,.85,-.08]];
projects.forEach((p,i)=>{const card=new T.Mesh(new T.BoxGeometry(cardWidth,cardHeight,.025,12,18,1),[new T.MeshStandardMaterial({color:0xd6ceb6}),new T.MeshStandardMaterial({color:0xd6ceb6}),new T.MeshStandardMaterial({color:0xd6ceb6}),new T.MeshStandardMaterial({color:0xd6ceb6}),new T.MeshStandardMaterial({map:cardTexture(p,i),roughness:.93}),new T.MeshStandardMaterial({color:0xd6ceb6})]);card.position.set(home[i][0],home[i][1],.12+i*.012);card.rotation.z=home[i][2];card.castShadow=card.receiveShadow=true;card.userData={type:'card',index:i,rest:Float32Array.from(card.geometry.attributes.position.array),flex:new T.Vector2(),flexV:new T.Vector2(),force:new T.Vector2(),baseZ:.12+i*.018,lift:0,liftV:0,dropAt:-10000,grab:new T.Vector2(0,0)};scene.add(card);cards.push(card);pickables.push(card);const pin=new T.Mesh(new T.SphereGeometry(.095,24,16),new T.MeshStandardMaterial({color:[0x154cb4,0x577691,0x427d88][i%3],roughness:.3,metalness:.25}));pin.scale.z=.7;pin.userData={type:'pin',index:i,offset:new T.Vector2(0,pinY)};pin.castShadow=true;scene.add(pin);pins.push(pin);pickables.push(pin);});
// Cylindrical bending preserves the sheet's arc length instead of stretching a flat rectangle.
function paperPoint(card,x,y,z){
 const d=card.userData,vertical=Math.max(.045,.30+d.lift+d.flex.y*.75+(d.impact||0)),side=.13+d.flex.x*.65;
 const sy=(pinY-y)/cardHeight,ax=side*x/cardWidth,ay=vertical*sy;
 const ry=cardHeight/vertical,rx=Math.abs(side)>.001?cardWidth/side:10000;
 const edge=Math.pow(Math.abs(x)/(cardWidth/2),3)*sy*sy;const corner=(.12+d.lift*.34)*edge;const scale=d.curveScale??1;return new T.Vector3(x+(rx*Math.sin(ax)-x)*scale,y+(pinY-ry*Math.sin(ay)+corner*.65-y)*scale,z+(ry*(1-Math.cos(ay))+rx*(1-Math.cos(ax))+corner)*scale);
}
function updatePins(){pins.forEach((p,i)=>{const v=paperPoint(cards[i],p.userData.offset.x,p.userData.offset.y,.12).applyAxisAngle(new T.Vector3(0,0,1),cards[i].rotation.z);p.position.copy(cards[i].position).add(v);});}updatePins();
const ropes=[];for(let k=0;k<projects.length-1;k++){const points=Array.from({length:25},(_,i)=>pins[k].position.clone().lerp(pins[k+1].position,i/24).add(new T.Vector3(0,-Math.sin(i/24*Math.PI)*.12,.02)));const rope={points,old:points.map(p=>p.clone()),a:k,b:k+1,length:pins[k].position.distanceTo(pins[k+1].position)*1.025,mesh:null};const mat=new T.MeshStandardMaterial({color:k%2?0x648c9e:0x315f9d,roughness:1});rope.mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),64,.012,6,false),mat);rope.mesh.castShadow=true;rope.mesh.userData={type:'rope',index:k};rope.hit=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.065,5,false),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));rope.hit.userData=rope.mesh.userData;scene.add(rope.mesh,rope.hit);pickables.push(rope.hit);ropes.push(rope);}
// Keep the workbench in one transform so photographs, pins and ropes turn together.
const boardRoot=new T.Group();
for(const child of [...scene.children])if(child.isMesh||child.isGroup)boardRoot.add(child);
scene.add(boardRoot);
let turnTarget=0;
document.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')turnTarget=(e.clientX/innerWidth*2-1)*.075;});
document.documentElement.addEventListener('pointerleave',()=>turnTarget=0);
const labels=projects.map((p,i)=>{const el=document.createElement('span');el.className='project-caption';el.textContent=section==='commercial'&&p[0].includes('/')?p[0].split('/').pop().trim():p[0];el.setAttribute('aria-hidden','true');stage.append(el);return el;});
function projectPoint(card,x,y,z=.075){return card.localToWorld(paperPoint(card,x,y,z)).project(camera);}
function positionLabels(){
 const w=stage.clientWidth,h=stage.clientHeight;
 const polys=cards.map(c=>{c.updateWorldMatrix(true,false);const edge=[];for(let i=0;i<=12;i++)edge.push([-cardWidth/2+cardWidth*i/12,-cardHeight/2]);for(let i=1;i<=18;i++)edge.push([cardWidth/2,-cardHeight/2+cardHeight*i/18]);for(let i=1;i<=12;i++)edge.push([cardWidth/2-cardWidth*i/12,cardHeight/2]);for(let i=1;i<18;i++)edge.push([-cardWidth/2,cardHeight/2-cardHeight*i/18]);return edge.map(([x,y])=>{const p=projectPoint(c,x,y);return[(p.x+1)*w/2,(-p.y+1)*h/2];});});
 cards.forEach((card,i)=>{
  const center=projectPoint(card,0,-cardHeight*.327),left=projectPoint(card,-cardWidth*.46,0),right=projectPoint(card,cardWidth*.46,0);
  const width=Math.max(65,Math.abs(right.x-left.x)*w/2),label=labels[i],x=(center.x+1)*w/2,y=(-center.y+1)*h/2;
  label.style.left=x+'px';label.style.top=y+'px';label.style.width=width+'px';label.style.fontSize=Math.max(12,Math.min(20,width*.105))+'px';label.style.zIndex=String(2+Math.round(card.userData.baseZ*100));label.hidden=center.z>1||center.z< -1;
  const height=label.offsetHeight||40,ox=x-width/2,oy=y-height/2;
  const holes=cards.flatMap((front,j)=>{if(j===i||front.userData.baseZ<=card.userData.baseZ)return [];const poly=polys[j];const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);if(Math.max(...xs)<ox||Math.min(...xs)>ox+width||Math.max(...ys)<oy||Math.min(...ys)>oy+height)return [];return ['<polygon fill="black" points="'+poly.map(([x,y])=>(x-ox).toFixed(1)+','+(y-oy).toFixed(1)).join(' ')+'"/>'];}).join('');
  if(holes){const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'"><defs><mask id="m"><rect width="100%" height="100%" fill="white"/>'+holes+'</mask></defs><rect width="100%" height="100%" fill="white" mask="url(#m)"/></svg>';label.style.maskImage='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';label.style.webkitMaskImage=label.style.maskImage;}else{label.style.maskImage='none';label.style.webkitMaskImage='none';}
 });
}
function sheetBounds(c,coarse=false){
 const p=c.geometry.attributes.position,angle=c.rotation.z,cos=Math.cos(angle),sin=Math.sin(angle);
 let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
 if(coarse){const ex=Math.abs(cos)*cardWidth/2+Math.abs(sin)*cardHeight/2,ey=Math.abs(sin)*cardWidth/2+Math.abs(cos)*cardHeight/2;return{minX:c.position.x-ex,maxX:c.position.x+ex,minY:c.position.y-ey,maxY:c.position.y+ey};}
 for(let i=0;i<p.count;i++){const x=c.position.x+p.getX(i)*cos-p.getY(i)*sin,y=c.position.y+p.getX(i)*sin+p.getY(i)*cos,z=c.position.z+p.getZ(i);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
 return{minX,maxX,minY,maxY,minZ,maxZ};
}
function pinPosition(c){const i=c.userData.index,off=pins[i].userData.offset;return paperPoint(c,off.x,off.y,.12).applyAxisAngle(new T.Vector3(0,0,1),c.rotation.z).add(c.position);}
function flexPaper(){
 const ordered=[...cards].sort((a,b)=>a.userData.baseZ-b.userData.baseZ);
 const footprints=ordered.map(c=>sheetBounds(c,true));
 ordered.forEach((c,i)=>{c.userData.curveScale=ordered.some((front,j)=>j>i&&overlaps2D(footprints[i],footprints[j]))?.08:1;});
 cards.forEach((c,i)=>{const d=c.userData,active=drag?.type==='card'&&drag.index===i;const elapsed=(performance.now()-d.dropAt)/1000;d.impact=!active&&elapsed<1.3?Math.sin(elapsed*19)*Math.exp(-elapsed*4.5)*.42:0;
  // Lift has its own underdamped spring, so holding still keeps the sheet visibly bowed.
  d.liftV+=((active?.95:0)-d.lift)*.075;d.liftV*=reduced?.55:.84;d.lift+=d.liftV;
  const target=active?d.force:new T.Vector2();d.flexV.x+=(target.x-d.flex.x)*.085;d.flexV.y+=(target.y-d.flex.y)*.085;d.flexV.multiplyScalar(reduced?.55:.82);d.flex.add(d.flexV);d.force.multiplyScalar(.93);
  c.position.z=T.MathUtils.lerp(c.position.z,d.baseZ+(active?.2:0),.16);
  const attr=c.geometry.attributes.position,rest=d.rest;
  for(let n=0;n<attr.count;n++){const q=paperPoint(c,rest[n*3],rest[n*3+1],rest[n*3+2]);attr.setXYZ(n,q.x,q.y,q.z);}
  attr.needsUpdate=true;c.geometry.computeVertexNormals();c.geometry.computeBoundingSphere();
 });
 resolvePaperStack(ordered,{bounds:c=>sheetBounds(c),raise:(c,dz)=>c.position.z+=dz,pin:pinPosition});
 updatePins();
}
const ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,0,1),-.3);let drag=null,hover=false;
function world(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const v=new T.Vector3();plane.setFromNormalAndCoplanarPoint(new T.Vector3(0,0,1).applyQuaternion(boardRoot.quaternion),boardRoot.localToWorld(new T.Vector3(0,0,.3)));ray.ray.intersectPlane(plane,v);return boardRoot.worldToLocal(v);}
canvas.addEventListener('pointerleave',()=>hint.hidden=true);
canvas.addEventListener('pointerdown',e=>{hint.hidden=true;const v=world(e),hit=ray.intersectObjects(pickables)[0];if(!hit)return;const localHit=boardRoot.worldToLocal(hit.point.clone());const d=hit.object.userData;if(d.type==='card'){cards[d.index].userData.lift=Math.max(.35,cards[d.index].userData.lift);cards[d.index].userData.liftV+=.09;cards[d.index].userData.dropAt=-10000;cards[d.index].userData.grab.set(localHit.x-cards[d.index].position.x,localHit.y-cards[d.index].position.y);const sorted=cards.filter((c,j)=>j!==d.index).sort((a,b)=>a.userData.baseZ-b.userData.baseZ);sorted.push(cards[d.index]);sorted.forEach((c,j)=>c.userData.baseZ=.12+j*.025);}drag={...d,id:e.pointerId,startX:e.clientX,startY:e.clientY,start:v.clone(),origin:cards[d.index]?.position.clone(),moved:false};if(d.type==='rope'){drag.node=Math.max(1,Math.min(23,ropes[d.index].points.reduce((best,p,i,arr)=>p.distanceTo(localHit)<arr[best].distanceTo(localHit)?i:best,0)));}canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{const v=world(e);if(!drag){const hit=ray.intersectObjects(pickables)[0];canvas.style.cursor=hit?'grab':'default';hint.hidden=!hit||hit.object.userData.type==='card';if(hit){const d=hit.object.userData;hint.textContent=d.type==='rope'?'Pull the thread':'Move the pin';const bounds=stage.getBoundingClientRect();hint.style.left=Math.min(e.clientX-bounds.left+14,bounds.width-230)+'px';hint.style.top=(e.clientY-bounds.top+18)+'px';}return;}if(e.pointerId!==drag.id)return;drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6;if(!drag.moved)return;if(drag.type==='card'){const c=cards[drag.index];const previous=c.position.clone();c.position.x=T.MathUtils.clamp(drag.origin.x+v.x-drag.start.x,-5+cardWidth/2,5-cardWidth/2);c.position.y=T.MathUtils.clamp(drag.origin.y+v.y-drag.start.y,-2.9+cardHeight/2,2.9-cardHeight/2);c.userData.force.set(T.MathUtils.clamp((c.position.x-previous.x)*4,-.75,.75),T.MathUtils.clamp((c.position.y-previous.y)*4,-.75,.75));updatePins();}else if(drag.type==='pin'){const c=cards[drag.index],p=pins[drag.index];const off=v.clone().sub(c.position).applyAxisAngle(new T.Vector3(0,0,1),-c.rotation.z);p.userData.offset.set(T.MathUtils.clamp(off.x,-cardWidth/2+.12,cardWidth/2-.12),T.MathUtils.clamp(off.y,-cardHeight/2+.12,cardHeight/2-.12));updatePins();}else{const rope=ropes[drag.index],a=rope.points[0],b=rope.points[24],mid=a.clone().lerp(b,drag.node/24),delta=v.clone().sub(mid);delta.clampLength(0,.9);drag.target=mid.add(delta);drag.target.z=.38;}});
function release(e){if(!drag||e.pointerId!==drag.id)return;const d=drag;if(d.type==='card'){cards[d.index].userData.dropAt=performance.now();cards[d.index].userData.liftV-=.08;}drag=null;hint.hidden=true;updatePins();if(!d.moved&&d.type==='card'&&e.type==='pointerup'){if(projects[d.index][3])location.href=projects[d.index][3];else $('#projects').showModal();}}canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
function reset(){drag=null;cards.forEach((c,i)=>{c.position.set(home[i][0],home[i][1],.12+i*.012);c.userData.baseZ=.12+i*.018;c.userData.lift=0;c.userData.liftV=0;c.userData.dropAt=-10000;c.userData.impact=0;c.userData.flex.set(0,0);c.userData.flexV.set(0,0);c.userData.force.set(0,0);pins[i].userData.offset.set(0,pinY);});updatePins();ropes.forEach(r=>r.points.forEach((p,i)=>{p.copy(pins[r.a].position).lerp(pins[r.b].position,i/24);r.old[i].copy(p);}));}$('#reset').onclick=reset;
let lit=true;$('#light').onclick=()=>{lit=!lit;lamp.intensity=lit?30:0;bulb.visible=lit;$('#light').textContent=lit?'Light on ↗':'Light off ↗';$('#light').setAttribute('aria-pressed',String(lit));};
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=Math.max(7.9,13.5/camera.aspect)/(2*Math.tan(T.MathUtils.degToRad(17.5)));camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(stage);resize();
let last=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function tick(now){requestAnimationFrame(tick);if(now-last<1000/60-1)return;last=now;flexPaper();if(!drag){boardRoot.rotation.y=T.MathUtils.lerp(boardRoot.rotation.y,reduced?0:turnTarget,.035);boardRoot.updateMatrixWorld(true);}ropes.forEach(r=>{const ps=r.points;for(let i=1;i<24;i++){const p=ps[i],old=r.old[i],v=p.clone().sub(old).multiplyScalar(reduced?.65:.94);old.copy(p);p.add(v);p.y-=.0007;p.z=Math.max(.22,p.z);}const segment=Math.max(r.length,pins[r.a].position.distanceTo(pins[r.b].position)*1.012)/24;for(let step=0;step<28;step++){ps[0].copy(pins[r.a].position);ps[24].copy(pins[r.b].position);if(drag?.type==='rope'&&ropes[drag.index]===r&&drag.target)ps[drag.node].copy(drag.target);for(let i=0;i<24;i++){const delta=ps[i+1].clone().sub(ps[i]),len=delta.length();delta.multiplyScalar((len-segment)/(len||1)*.5);if(i>0)ps[i].add(delta);if(i+1<24)ps[i+1].sub(delta);}}r.hit.geometry.dispose();r.hit.geometry=new T.TubeGeometry(new T.CatmullRomCurve3(ps),32,.065,5,false);r.mesh.geometry.dispose();r.mesh.geometry=new T.TubeGeometry(new T.CatmullRomCurve3(ps),64,.012,6,false);});renderer.render(scene,camera);positionLabels();}requestAnimationFrame(tick);$('#status').hidden=true;
