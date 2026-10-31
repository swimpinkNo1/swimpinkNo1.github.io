const audio=document.querySelector('#composition'),room=document.querySelector('.listening-room'),label=document.querySelector('#movement-label'),message=document.querySelector('.audio-message');
const movements=[{"time": 0, "name": "GENESIS"}, {"time": 64, "name": "LIFE WITHOUT SEEING"}, {"time": 105, "name": "HUMAN DISTURBANCE"}, {"time": 163, "name": "NATURAL RESPONSE"}, {"time": 258, "name": "FRACTURE AND MEMORIES"}, {"time": 291, "name": "AFTERMATH AND HOPE"}];
let pending=null;
function update(){const time=audio.currentTime;let index=0;movements.forEach((m,i)=>{if(time>=m.time)index=i});label.textContent=movements[index].name;document.querySelectorAll('[data-time]').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)))}
audio.addEventListener('play',()=>{room.classList.add('playing');message.textContent='';update()});
for(const event of ['pause','ended','waiting'])audio.addEventListener(event,()=>room.classList.remove('playing'));
audio.addEventListener('playing',()=>room.classList.add('playing'));
audio.addEventListener('timeupdate',update);
audio.addEventListener('error',()=>{room.classList.remove('playing');message.innerHTML='The recording could not load. <a href="ecological-echoes.html">Listen on the original project page ↗</a>'});
function seek(time){audio.currentTime=time;audio.play().catch(()=>{message.textContent='Press play to begin listening.'});update()}
document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{const time=Number(b.dataset.time);if(audio.readyState>=1)seek(time);else{pending=time;message.textContent='Loading the recording…';audio.load()}}));
audio.addEventListener('loadedmetadata',()=>{if(pending!==null){const time=pending;pending=null;seek(time)}});
document.querySelector('.load-experiment').addEventListener('click',e=>{audio.pause();const frame=document.createElement('iframe');frame.className='experiment-frame';frame.src='https://editor.p5js.org/mailmanvicky/full/rbI8YzS5u';frame.title='Original data sonification experiment';frame.allow='autoplay';document.querySelector('#experiment').replaceChildren(frame);e.currentTarget.remove()});
