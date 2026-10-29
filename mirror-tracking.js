// Load model bytes with bounded network waits; initialise WASM graphs sequentially.
async function deadline(work,ms,signal,dispose){
 let timer,abort,expired=false;
 const pending=Promise.resolve(work).then(value=>{if(expired){dispose?.(value);throw Error('Tracking setup was cancelled')}return value});
 try{return await Promise.race([pending,new Promise((_,reject)=>{
 timer=setTimeout(()=>{expired=true;reject(Error('Tracking preparation timed out'))},ms);
 abort=()=>{expired=true;reject(Error('Tracking preparation cancelled'))};
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 })])}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
export async function loadMirrorTracking({onProgress=()=>{},signal}={}){
 let face,hand;
 try{
 onProgress('Loading face and fingertip models…');
 const {FaceLandmarker,HandLandmarker,FilesetResolver}=await deadline(import('./vendor/mediapipe/vision_bundle.mjs'),20000,signal);
 const resolver=await deadline(FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm',import.meta.url).href),20000,signal);
 const load=async name=>{const response=await fetch(new URL('assets/magic-mirror/'+name,import.meta.url),{signal});if(!response.ok)throw Error(name+' HTTP '+response.status);return new Uint8Array(await response.arrayBuffer())};
 const [faceBytes,handBytes]=await deadline(Promise.all([load('face_landmarker.task'),load('hand_landmarker.task')]),30000,signal);
 onProgress('Starting mouth tracking…');
 face=await deadline(FaceLandmarker.createFromOptions(resolver,{baseOptions:{modelAssetBuffer:faceBytes},runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true}),30000,signal,m=>m.close());
 onProgress('Starting fingertip tracking…');
 hand=await deadline(HandLandmarker.createFromOptions(resolver,{baseOptions:{modelAssetBuffer:handBytes},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.4,minHandPresenceConfidence:.4,minTrackingConfidence:.4}),30000,signal,m=>m.close());
 return {face,hand};
 }catch(error){face?.close();hand?.close();throw error}
}
