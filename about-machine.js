import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const stage = document.querySelector('.mechanical-stage');
const paperDOM = document.querySelector('.paper');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
try {
  const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xf1efe9, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'machine-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 80);
  camera.position.set(.12, 7.6, 13.8);
  const target = new THREE.Vector3(0, 3.0, .05);
  camera.lookAt(target);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), .04);
  scene.environment = environment.texture;
  scene.add(new THREE.HemisphereLight(0xfffdf0, 0x527398, 2.2));
  const keyLight = new THREE.DirectionalLight(0xfffaf0, 4.2);
  keyLight.position.set(-5, 11, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048,2048);
  Object.assign(keyLight.shadow.camera, {left:-8,right:8,top:9,bottom:-7,near:.1,far:30});
  keyLight.shadow.normalBias = .025;
  keyLight.shadow.bias = -.0003;
  keyLight.shadow.radius = 5;
  keyLight.shadow.blurSamples = 8;
  scene.add(keyLight);
  const fill = new THREE.DirectionalLight(0xa1caff,1.3);
  fill.position.set(6,5,-3); scene.add(fill);
  const model = new THREE.Group(); scene.add(model);
  const materials = {
    enamel: new THREE.MeshPhysicalMaterial({color:0x205bbb, metalness:.3, roughness:.26, clearcoat:1,clearcoatRoughness:.17}),
    edge: new THREE.MeshPhysicalMaterial({color:0x103a7e,metalness:.4,roughness:.3,clearcoat:.8}),
    pale: new THREE.MeshPhysicalMaterial({color:0x729ed0,metalness:.24,roughness:.28,clearcoat:.7}),
    chrome: new THREE.MeshStandardMaterial({color:0xc6d5dd,metalness:.92,roughness:.2}),
    darkMetal: new THREE.MeshStandardMaterial({color:0x243449,metalness:.75,roughness:.35}),
    rubber: new THREE.MeshStandardMaterial({color:0x111c29,roughness:.85}),
    ivory: new THREE.MeshPhysicalMaterial({color:0xf4efd9,roughness:.3,clearcoat:.4}),
    black: new THREE.MeshStandardMaterial({color:0x0a1528,roughness:.7}),
    paper: new THREE.MeshStandardMaterial({color:0xfffcf1,roughness:.94,side:THREE.DoubleSide})
  };
  function mesh(geo,mat,parent=model) {const o=new THREE.Mesh(geo,mat);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,mat,x,y,z,parent=model){const o=mesh(new THREE.BoxGeometry(w,h,d),mat,parent);o.position.set(x,y,z);return o;}
  function rounded(w,d,h,r,mat,x,y,z,parent=model){
    const shape=new THREE.Shape(),a=-w/2,b=-d/2;
    shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);
    shape.lineTo(a+w,b+d-r);shape.quadraticCurveTo(a+w,b+d,a+w-r,b+d);
    shape.lineTo(a+r,b+d);shape.quadraticCurveTo(a,b+d,a,b+d-r);
    shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);
    const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.045,bevelThickness:.045,curveSegments:10});
    geo.rotateX(-Math.PI/2);
    const o=mesh(geo,mat,parent);o.position.set(x,y,z);return o;
  }
  function cylinder(r,h,mat,x,y,z,parent=model,axis='y'){
    const o=mesh(new THREE.CylinderGeometry(r,r,h,40),mat,parent);o.position.set(x,y,z);
    if(axis==='x')o.rotation.z=Math.PI/2;if(axis==='z')o.rotation.x=Math.PI/2;return o;
  }
  function rod(a,b,r,mat,parent=model){
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),o=mesh(new THREE.CylinderGeometry(r,r,A.distanceTo(B),10),mat,parent);
    o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.sub(A).normalize());return o;
  }
  function label(text,w,h,font,color='#183e77',bg=null){
    const c=document.createElement('canvas');c.width=1024;c.height=Math.max(128,Math.round(1024*h/w));
    const g=c.getContext('2d');if(bg){g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);}
    g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.font=font;g.fillText(text,c.width/2,c.height/2);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();
    return new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  }
  function planeLabel(text,w,h,font,x,y,z,rotation=0,parent=model,color){
    const o=mesh(new THREE.PlaneGeometry(w,h),label(text,w,h,font,color),parent);o.position.set(x,y,z);o.rotation.x=rotation;o.castShadow=false;return o;
  }
  // Cast enamel shell, a recessed keyboard bed and a distinct rolled front edge.
  rounded(8.05,4.65,.34,.65,materials.edge,0,.25,.35);
  rounded(7.94,4.48,.35,.58,materials.enamel,0,.57,.34);
  rounded(7.33,3.0,.08,.38,materials.black,0,.96,.92);
  rounded(7.75,.55,.25,.22,materials.enamel,0,.83,2.38);
  rounded(.34,3.4,.3,.12,materials.pale,-3.77,.86,.55);
  rounded(.34,3.4,.3,.12,materials.enamel,3.77,.86,.55);
  rounded(7.48,.72,.48,.26,materials.enamel,0,1.02,-1.45);
  const hood=rounded(7.12,.72,.23,.22,materials.enamel,0,1.31,-.83);hood.rotation.x=-.15;
  // Small machine feet and a visible seam under the shell.
  for(const x of [-3.1,3.1])for(const z of [-1.25,1.9])cylinder(.3,.23,materials.rubber,x,.12,z);
  for(const x of [-3.55,3.55]){
    const screw=cylinder(.065,.014,materials.chrome,x,1.33,-1.43);
    box(.075,.008,.012,materials.darkMetal,x,1.341,-1.43);
  }
  planeLabel('I N V I S I B L E P A L M I S T R Y',5.9,.24,'500 100px Georgia',0,1.50,-1.4,-Math.PI/2,model,'#dce7e9');
  planeLabel('MODEL 04',1.2,.15,'32px monospace',-2.75,.89,2.69,0,model,'#afc9e3');
  // Exposed typebasket: individual steel arms converge toward the printing point.
  const basket= new THREE.Group();basket.position.set(0,1.16,-.75);model.add(basket);
  for(let i=0;i<33;i++){
    const angle=(-1.28+i/32*2.56),x=Math.sin(angle)*1.65,z=Math.cos(angle)*.72;
    rod([x,0,z],[x*.45,.15,-.22],.018,materials.darkMetal,basket);
    rod([x*.45,.15,-.22],[x*.12,.22,-.42],.018,materials.chrome,basket);
  }
  // Ink ribbon, two spool reels, and ribbon guides at the paper.
  for(const x of [-2.52,2.52]){
    cylinder(.43,.07,materials.darkMetal,x,1.49,-.87);
    cylinder(.31,.08,materials.black,x,1.54,-.87);
    cylinder(.43,.025,materials.darkMetal,x,1.59,-.87);
    cylinder(.065,.05,materials.chrome,x,1.63,-.87);
    for(let k=0;k<6;k++){
      const a=k*Math.PI/3;
      cylinder(.055,.027,materials.black,x+Math.cos(a)*.25,1.607,-.87+Math.sin(a)*.25);
    }
  }
  box(5.03,.11,.022,materials.black,0,1.60,-1.04);
  box(5.03,.055,.024,new THREE.MeshStandardMaterial({color:0x2d4879,roughness:.85}),0,1.55,-1.025);
  for(const x of [-.25,.25])rod([x,1.3,-1.06],[x,1.89,-1.06],.026,materials.chrome);
  const hammer=new THREE.Group();hammer.position.set(0,1.12,-.22);model.add(hammer);
  rod([0,0,0],[0,.12,-.92],.024,materials.chrome,hammer);
  box(.16,.065,.11,materials.darkMetal,0,.12,-.92,hammer);
  // Carriage, rubber platen, polished paper bail, ratchet knobs and return lever.
  const carriage=new THREE.Group();model.add(carriage);
  cylinder(.23,7.02,materials.rubber,0,1.91,-1.4,carriage,'x');
  cylinder(.06,7.73,materials.chrome,0,1.91,-1.4,carriage,'x');
  for(const x of [-3.72,3.72]){
    cylinder(.31,.27,materials.ivory,x,1.91,-1.4,carriage,'x');
    for(let i=0;i<32;i++){
      const a=i/32*Math.PI*2;
      rod([x-.14,1.91+Math.sin(a)*.307,-1.4+Math.cos(a)*.307],[x+.14,1.91+Math.sin(a)*.307,-1.4+Math.cos(a)*.307],.009,materials.chrome,carriage);
    }
    cylinder(.14,.29,materials.pale,x,1.91,-1.4,carriage,'x');
  }
  cylinder(.035,7.12,materials.chrome,0,2.02,-1.08,carriage,'x');
  for(const x of [-2.17,2.17]){
    cylinder(.09,.23,materials.rubber,x,2.02,-1.08,carriage,'x');
    rod([x,1.7,-1.6],[x,2.02,-1.08],.024,materials.chrome,carriage);
  }
  rod([-3.35,1.8,-1.3],[-3.65,2.12,-1.85],.045,materials.chrome,carriage);
  rod([-3.65,2.12,-1.85],[-4.35,2.21,-.74],.052,materials.chrome,carriage);
  rounded(.44,.6,.10,.09,materials.pale,-4.35,2.16,-.74,carriage);
  // Paper follows the actual 3D plane; DOM type follows its projected corners.
  const paper=new THREE.Group();paper.position.set(0,4.19,-1.55);paper.rotation.x=-.09;carriage.add(paper);
  const paperW=6.4,paperH=4.7;
  const paperMesh=mesh(new THREE.PlaneGeometry(paperW,paperH,1,1),materials.paper,paper);
  paperMesh.castShadow=true;
  // The bottom of the sheet curls naturally into the platen.
  const curlGeo=new THREE.PlaneGeometry(paperW,.46,1,16);
  const pos=curlGeo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const f=(pos.getY(i)+.23)/.46;
    pos.setY(i,-paperH/2-.46+f*.46);
    pos.setZ(i,.18*Math.sin((1-f)*Math.PI/2));
  }
  curlGeo.computeVertexNormals();const curl=mesh(curlGeo,materials.paper,paper);
  // Round, dished ivory keycaps sit on independent steel plungers.
  const keys=new Map(), hitTargets=[];
  const keyRows=['1234567890','QWERTYUIOP','ASDFGHJKL','⇧ZXCVBNM,.↵'];
  keyRows.forEach((row,ri)=>{
    const step=.585;
    [...row].forEach((char,ci)=>{
      const group=new THREE.Group();group.position.set((ci-(row.length-1)/2)*step,1.16-ri*.055,-.17+ri*.60);model.add(group);
      cylinder(.052,.28,materials.chrome,0,.02,0,group);
      cylinder(.224,.08,materials.chrome,0,.16,0,group);
      const profile=[new THREE.Vector2(0,.225),new THREE.Vector2(.16,.225),new THREE.Vector2(.194,.24),new THREE.Vector2(.207,.255),new THREE.Vector2(.217,.235),new THREE.Vector2(.217,.17),new THREE.Vector2(.195,.15)];
      const cap=mesh(new THREE.LatheGeometry(profile.reverse(),40),ri===0?materials.ivory:materials.ivory,group);
      const text=char==='⇧'?'SHIFT':char==='↵'?'↵':char;
      planeLabel(text,.31,.23,char==='⇧'?'bold 220px monospace':'580px monospace',0,.257,0,-Math.PI/2,group);
      cap.userData.key=char;hitTargets.push(cap);
      keys.set(char,{group,rest:group.position.y,depth:0,velocity:0});
      rod([group.position.x,1.0,group.position.z],[group.position.x*.32,1.18,-.52],.014,materials.darkMetal);
    });
  });
  const space=new THREE.Group();space.position.set(0,1.02,2.22);model.add(space);
  for(const x of [-1.4,1.4])cylinder(.055,.22,materials.chrome,x,0,0,space);
  const spaceCap=rounded(3.65,.40,.14,.08,materials.ivory,0,.08,0,space);spaceCap.userData.key=' ';hitTargets.push(spaceCap);
  keys.set(' ',{group:space,rest:space.position.y,depth:0,velocity:0});
  // Soft contact shadow; no painted or photographed stand-in for the machine.
  const floor=mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.14}),scene);
  floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.castShadow=false;
  stage.classList.add('real-machine');
  let width=0,height=0,frame=0,previous=performance.now(),strikeTime=-10,carriageTarget=0,carriageV=0;
  let travelCount=0,returnTime=-10;
  let feed= document.querySelector('#skip').disabled ? paperH : 1.0, feedTarget=feed, feedV=0;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown',event=>{
    const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(hitTargets,false)[0];
    if(hit){const char=hit.object.userData.key;[...document.querySelectorAll('.key')].find(b=>(b.textContent==='SPACE'?' ':b.textContent==='SHIFT'?'⇧':b.textContent==='RETURN'?'↵':b.textContent)===char)?.click();}
  });
  renderer.domElement.addEventListener('pointermove',event=>{
    const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);
    raycaster.setFromCamera(pointer,camera);renderer.domElement.style.cursor=raycaster.intersectObjects(hitTargets,false).length?'pointer':'default';
  });
  function wake(){if(!frame&&!document.hidden){previous=performance.now();frame=requestAnimationFrame(render);}}
  document.addEventListener('typewriter-strike',e=>{
    const key=keys.get(e.detail.key);if(key){key.velocity=-2.5;key.depth=-.07;}
    strikeTime=performance.now()/1000;
    if(!['⇧','↵'].includes(e.detail.key)){travelCount++;carriageTarget=.8-(travelCount%37)*.045;}
    wake();
  });
  document.addEventListener('typewriter-return',e=>{carriageTarget=.8;travelCount=0;feedTarget=Math.min(paperH,1.0+e.detail.line*.27);returnTime=performance.now()/1000;wake();});
  document.addEventListener('typewriter-reset',()=>{carriageTarget=.8;travelCount=0;feed=1.0;feedTarget=1.0;feedV=0;wake();});
  document.addEventListener('typewriter-finish',()=>{feedTarget=paperH;carriageTarget=0;wake();});
  // Map the paper's four world corners to a CSS projective transform.
  // Text stays selectable and accessible while remaining attached to the 3D sheet.
  function paperTransform(){
    paper.updateWorldMatrix(true,false);
    const corners=[[-paperW/2,paperH/2],[paperW/2,paperH/2],[paperW/2,-paperH/2],[-paperW/2,-paperH/2]].map(([x,y])=>{
      const p=new THREE.Vector3(x,y,0);paper.localToWorld(p);p.project(camera);return [(p.x+1)*width/2,(1-p.y)*height/2];
    });
    const source=[[0,0],[575,0],[575,470],[0,470]],A=[],B=[];
    for(let i=0;i<4;i++){const [x,y]=source[i],[u,v]=corners[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);B.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);B.push(v);}
    for(let i=0;i<8;i++){
      let p=i;for(let k=i+1;k<8;k++)if(Math.abs(A[k][i])>Math.abs(A[p][i]))p=k;
      [A[i],A[p]]=[A[p],A[i]];[B[i],B[p]]=[B[p],B[i]];
      const d=A[i][i];for(let j=i;j<8;j++)A[i][j]/=d;B[i]/=d;
      for(let k=0;k<8;k++)if(k!==i){const f=A[k][i];for(let j=i;j<8;j++)A[k][j]-=f*A[i][j];B[k]-=f*B[i];}
    }
    const [a,b,c,d,e,f,g,h]=B;
    paperDOM.style.transform=`matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`;
  }
  function resize(){
    width=stage.clientWidth;height=stage.clientHeight;
    renderer.setSize(width,height,false);camera.aspect=width/height;
    // Fit both the paper's height and the complete return lever into view.
    const verticalFov=34*Math.PI/180;
    const dist=Math.max(8.7/(2*Math.tan(verticalFov/2)),9.7/(2*Math.tan(verticalFov/2)*camera.aspect));
    const direction=new THREE.Vector3(.008,.34,.94).normalize();
    camera.position.copy(target).addScaledVector(direction,dist);camera.lookAt(target);camera.updateProjectionMatrix();
    wake();
  }
  new ResizeObserver(resize).observe(stage);
  function render(now){
    frame=0;
    const dt=Math.min((now-previous)/1000,.025);previous=now;
    let moving=false;
    if(reduced.matches){carriageTarget=0;carriageV=0;feedTarget=paperH;feedV=0;}
    for(const key of keys.values()){
      key.velocity+=(-420*key.depth-25*key.velocity)*dt;key.depth+=key.velocity*dt;
      key.group.position.y=key.rest+(reduced.matches?0:key.depth);
      if(Math.abs(key.depth)>.0002||Math.abs(key.velocity)>.001)moving=true;
    }
    const t=now/1000-strikeTime,returnT=now/1000-returnTime;
    hammer.rotation.x=!reduced.matches&&t<.12?Math.sin(t/.12*Math.PI)*.94:0;
    if(t<.15)moving=true;
    carriageV+=((carriageTarget-carriage.position.x)*110-carriageV*18)*dt;
    carriage.position.x+=carriageV*dt;
    if(reduced.matches)carriage.position.x=0;
    if(Math.abs(carriageTarget-carriage.position.x)>.0001||Math.abs(carriageV)>.001)moving=true;
    feedV+=((feedTarget-feed)*125-feedV*21)*dt;feed+=feedV*dt;
    if(reduced.matches)feed=paperH;
    if(Math.abs(feedTarget-feed)>.0001||Math.abs(feedV)>.001)moving=true;
    const exposed=Math.max(.9,Math.min(paperH,feed));
    paperMesh.scale.y=exposed/paperH;paperMesh.position.y=(paperH-exposed)/2;
    curl.position.y=paperH-exposed;
    paper.position.y=1.85+exposed-paperH/2;
    paperDOM.style.clipPath=`inset(0 0 ${Math.max(0,(1-exposed/paperH)*470)}px 0)`;
    if(returnT<.3)moving=true;
    paperTransform();renderer.render(scene,camera);
    if(moving&&!document.hidden)frame=requestAnimationFrame(render);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
  reduced.addEventListener('change',wake);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();stage.classList.remove('real-machine');paperDOM.style.transform='';paperDOM.style.clipPath='';cancelAnimationFrame(frame);frame=0;});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{stage.classList.add('real-machine');resize();});
  resize();
} catch(error) {
  stage.classList.remove('real-machine');
  paperDOM.style.transform='';paperDOM.style.clipPath='';
  stage.querySelector('.machine-canvas')?.remove();
  console.warn('The accessible typewriter fallback is active.',error);
}
