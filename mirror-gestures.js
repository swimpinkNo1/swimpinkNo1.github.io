const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.y-b.y):Infinity;
export function blowingPose(landmarks,scores){
 if(!landmarks||landmarks.length<455)return false;
 const width=distance(landmarks[61],landmarks[291]),faceWidth=distance(landmarks[234],landmarks[454]);
 const opening=distance(landmarks[13],landmarks[14])/Math.max(width,.001);
 const narrow=width/Math.max(faceWidth,.001)<.34;
 const rounded=(scores.mouthPucker||0)>.50||(scores.mouthFunnel||0)>.55;
 const speaking=(scores.jawOpen||0)>.38||(scores.mouthSmileLeft||0)+(scores.mouthSmileRight||0)>.65;
 return narrow&&rounded&&!speaking&&opening>.025&&opening<.72;
}
export function indexPointing(points,retaining=false){
 if(!points||points.length<21)return false;
 const joints=[points[5],points[6],points[7],points[8]];
 if(joints.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;
 // Depth matters when the finger points towards the camera or turns sideways.
 const delta=(a,b)=>[a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0)];
 const length=v=>Math.hypot(...v),dist=(a,b)=>length(delta(a,b));
 const [mcp,pip,dip,tip]=joints,a=delta(mcp,pip),b=delta(tip,pip);
 const cosine=a.reduce((sum,v,i)=>sum+v*b[i],0)/Math.max(length(a)*length(b),.000001);
 const chain=dist(mcp,pip)+dist(pip,dip)+dist(dip,tip);
 const straightness=dist(mcp,tip)/Math.max(chain,.000001);
 // A relaxed index is sufficient. Thumb and other fingers do not gate the light.
 return chain>.015&&cosine<(retaining?-.20:-.40)&&straightness>(retaining?.70:.78)&&dist(tip,mcp)>dist(dip,mcp)*(retaining?.93:1.01);
}
export function createWandGate(){
 let active=false,lastSeen=-Infinity;
 return {update(points,t){
  const detected=indexPointing(points,active);
  if(detected){active=true;lastSeen=t;return {active:true,tracked:true}}
  // Hold the last position briefly through missing detections; never extrapolate a path.
  const grace=points?180:420;
  if(t-lastSeen>grace)active=false;
  return {active,tracked:false};
 },reset(){active=false;lastSeen=-Infinity}};
}
export function createBreathGate(){let since=null;return{update(visible,pose,t){if(!visible||!pose){since=null;return false}if(since===null)since=t;return t-since>=240},reset(){since=null}}}
