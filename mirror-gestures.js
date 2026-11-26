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
 // A noisy depth channel must not hide a finger that is straight on the glass.
 const delta=(a,b)=>[a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0)];
 const delta2=(a,b)=>[a.x-b.x,a.y-b.y];
 const length=v=>Math.hypot(...v),dist=(a,b)=>length(delta(a,b)),dist2=(a,b)=>length(delta2(a,b));
 const [mcp,pip,dip,tip]=joints;
 const pose=(cosineLimit,straightLimit,reach,chainOf,span)=>{
  const a=span(mcp,pip),b=span(tip,pip);
  const cosine=a.reduce((sum,v,i)=>sum+v*b[i],0)/Math.max(length(a)*length(b),.000001);
  const chain=chainOf(mcp,pip)+chainOf(pip,dip)+chainOf(dip,tip);
  const straightness=chainOf(mcp,tip)/Math.max(chain,.000001);
  return chain>.015&&cosine<cosineLimit&&straightness>straightLimit&&chainOf(tip,mcp)>chainOf(dip,mcp)*reach;
 };
 const spatial=pose(retaining?-.15:-.30,retaining?.62:.72,retaining?.90:.98,dist,delta);
 const flat=pose(retaining?-.12:-.25,retaining?.64:.74,retaining?.90:.97,dist2,delta2);
 return spatial||flat;
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
