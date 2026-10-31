import * as THREE from 'three';
// A palm-sized brayer viewed from the operator's side, rather than a cursor icon.
const host = document.querySelector('.brayer-cursor');
if (host) {
  try {
    const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(340,280);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.setClearColor(0,0); host.replaceChildren(renderer.domElement);
    const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(32,340/280,.1,80);
    camera.position.set(0,8.8,10.5);camera.lookAt(0,0,2.15);
    scene.add(new THREE.HemisphereLight(0xf6faff,0x60728b,2.7));
    const key=new THREE.DirectionalLight(0xfffcf1,4.2);key.position.set(-5,10,4);key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);
    const fill=new THREE.DirectionalLight(0x9cc8ff,2);fill.position.set(5,3,-6);scene.add(fill);
    const tool=new THREE.Group();scene.add(tool);
    const rubber=new THREE.MeshStandardMaterial({color:0x14253b,roughness:.68,metalness:.06});
    const enamel=new THREE.MeshPhysicalMaterial({color:0x0758b8,roughness:.22,metalness:.18,clearcoat:1,clearcoatRoughness:.16});
    const chrome=new THREE.MeshStandardMaterial({color:0xc4d1db,metalness:.92,roughness:.24});
    function mesh(geo,mat,parent=tool){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
    function rod(a,b,r,mat){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);const m=mesh(new THREE.CylinderGeometry(r,r,d.length(),18),mat);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
    const drum=new THREE.Group();drum.position.set(0,.65,0);tool.add(drum);
    const cylinder=mesh(new THREE.CylinderGeometry(.64,.64,3.05,64,1),rubber,drum);cylinder.rotation.z=Math.PI/2;
    // A faint ink film and a longitudinal seam make the rotation visible in the light.
    const film=new THREE.MeshStandardMaterial({color:0x123e76,roughness:.36,metalness:.08});
    const stripe=mesh(new THREE.BoxGeometry(2.98,.018,.035),film,drum);stripe.position.y=.64;
    for(const x of [-1.56,1.56]){
      const cap=mesh(new THREE.CylinderGeometry(.58,.58,.10,48),rubber,drum);cap.rotation.z=Math.PI/2;cap.position.x=x;
      const axle=mesh(new THREE.CylinderGeometry(.19,.19,.31,24),chrome);axle.rotation.z=Math.PI/2;axle.position.set(x,.65,0);
      rod([Math.sign(x)*1.78,.65,0],[Math.sign(x)*1.78,.65,1.45],.09,chrome);
      rod([Math.sign(x)*1.78,.65,1.45],[Math.sign(x)*.58,.65,1.65],.09,chrome);
    }
    // Sculpted moulded handle: narrower at its neck and fuller in the palm.
    const profile=[new THREE.Vector2(.19,0),new THREE.Vector2(.22,.25),new THREE.Vector2(.25,.7),new THREE.Vector2(.34,1.5),new THREE.Vector2(.38,2.1),new THREE.Vector2(.29,2.35),new THREE.Vector2(.0,2.42)];
    const handle=mesh(new THREE.LatheGeometry(profile,40),enamel);handle.rotation.x=Math.PI/2;handle.position.set(0,.78,1.5);
    const shoulder=mesh(new THREE.SphereGeometry(1,40,24),enamel);shoulder.scale.set(1.11,.22,.52);shoulder.position.set(0,.68,1.53);
    const end=mesh(new THREE.TorusGeometry(.13,.037,12,24),chrome);end.rotation.x=-Math.PI/2;end.position.set(0,.99,3.58);
    const plane=mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.3}),scene);plane.rotation.x=-Math.PI/2;plane.position.y=-.025;plane.castShadow=false;
    let frame=0,angle=0,target=0,distance=0,lastDistance=0,pressure=0,targetPressure=0,last=0;
    function draw(now){frame=0;const dt=Math.min((now-last)/1000||.016,.04);last=now;
      angle+=(target-angle)*Math.min(1,dt*14);pressure+=(targetPressure-pressure)*Math.min(1,dt*20);
      tool.rotation.y=-angle;tool.position.y=.04-pressure*.035;tool.rotation.x=-pressure*.025;
      drum.rotation.x=distance/.64;lastDistance=distance;
      renderer.render(scene,camera);
      if(Math.abs(target-angle)>.001||Math.abs(targetPressure-pressure)>.001)frame=requestAnimationFrame(draw);
    }
    function wake(){if(!frame){last=performance.now();frame=requestAnimationFrame(draw);}}
    document.addEventListener('brayer-motion',e=>{
      const d=e.detail;distance+=d.roll/22;target=d.angle;targetPressure=d.pressure;
      // The screen contact point stays under the rubber, with the handle toward the viewer.
      host.style.transform=`translate(${d.x-170}px,${d.y-91}px)`;wake();
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
    host.classList.add('brayer-3d');wake();
  } catch(e) { /* The shaded SVG remains the fallback on devices without WebGL. */ }
}
