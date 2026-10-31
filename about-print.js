/* Each plate has one shared, persistent ink mask. Typography remains selectable HTML. */
(() => {
  const cursor = document.createElement('div');
  cursor.className = 'brayer-cursor'; cursor.setAttribute('aria-hidden','true');
  cursor.innerHTML = `<svg viewBox="0 0 82 132" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rubber" x2="0" y2="1"><stop stop-color="#626773"/><stop offset=".18" stop-color="#30343e"/><stop offset=".58" stop-color="#101724"/><stop offset=".88" stop-color="#323946"/><stop offset="1" stop-color="#131b2b"/></linearGradient><linearGradient id="blue"><stop stop-color="#123d7c"/><stop offset=".25" stop-color="#2a83cc"/><stop offset=".6" stop-color="#1264b0"/><stop offset="1" stop-color="#123e7e"/></linearGradient><linearGradient id="steel"><stop stop-color="#556779"/><stop offset=".4" stop-color="#eef5fa"/><stop offset=".6" stop-color="#768797"/><stop offset="1" stop-color="#35475c"/></linearGradient></defs><path d="M9 14V42Q9 47 18 47H64Q73 47 73 40V14" fill="none" stroke="url(#steel)" stroke-width="5"/><rect x="7" y="6" width="68" height="29" rx="5" fill="url(#rubber)" stroke="#172335"/><path d="M17 42Q16 37 23 37H59Q66 37 65 43L62 61Q59 69 49 72L48 118Q48 128 41 128Q33 128 33 119L32 72Q23 68 20 61Z" fill="url(#blue)" stroke="#255286"/><path d="M23 42H58M25 57Q41 67 57 57" fill="none" stroke="#74b9e6" stroke-opacity=".35" stroke-width="2"/><rect x="38" y="106" width="6" height="13" rx="3" fill="#eee" stroke="#123e7e"/><path d="M13 10H69" stroke="#fff" opacity=".18"/></svg>`;
  document.body.append(cursor);
  const plates = [...document.querySelectorAll('.print-plate')].map(plate => {
    const original = plate.querySelector('.plate-content'), ink = original.cloneNode(true);
    ink.classList.add('ink-content'); ink.setAttribute('aria-hidden','true'); plate.append(ink);
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    let last = null, pending = 0, full = false, travel = 0, heading = 0;
    // Stable paper tooth: a grain map is reused for each pass, so ink builds on ridges.
    const tooth=document.createElement('canvas');tooth.width=128;tooth.height=128;
    const tc=tooth.getContext('2d'), pixels=tc.createImageData(128,128);
    for(let i=0;i<pixels.data.length;i+=4){const n=Math.random();pixels.data[i+3]=n<.09?0:Math.round(90+Math.pow(n,.45)*165);}
    tc.putImageData(pixels,0,0);
    const stamp=document.createElement('canvas');stamp.width=126;stamp.height=12;
    const sc=stamp.getContext('2d');
    sc.fillStyle=sc.createPattern(tooth,'repeat');sc.fillRect(0,0,126,12);
    sc.globalCompositeOperation='destination-in';
    const edge=sc.createLinearGradient(0,0,126,0);edge.addColorStop(0,'transparent');edge.addColorStop(.035,'#0009');edge.addColorStop(.12,'#000');edge.addColorStop(.87,'#000');edge.addColorStop(.97,'#0009');edge.addColorStop(1,'transparent');sc.fillStyle=edge;sc.fillRect(0,0,126,12);
    function publish() {pending = 0; const mask = `url("${canvas.toDataURL()}")`; ink.style.maskImage = mask; ink.style.webkitMaskImage = mask;}
    function size() {
      // Preserve ink in normalised plate coordinates when the layout changes.
      const old = document.createElement('canvas'); old.width=canvas.width;old.height=canvas.height;
      if(old.width && old.height)old.getContext('2d').drawImage(canvas,0,0);
      canvas.width=Math.ceil(plate.clientWidth);canvas.height=Math.ceil(plate.clientHeight);
      if(full){ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);}
      else if(old.width && old.height)ctx.drawImage(old,0,0,canvas.width,canvas.height);
      last=null;publish();
    }
    function brush(event) {
      const r=plate.getBoundingClientRect(), x=event.clientX-r.left,y=event.clientY-r.top;
      const previous=last || {x,y}, dx=x-previous.x,dy=y-previous.y;
      const length=Math.hypot(dx,dy), pressed=event.buttons>0 || event.pointerType==='touch';
      if(length>1){
        // The axle stays across the direction of travel. Avoid a full flip on the return pass.
        let next=Math.atan2(-dx,dy);
        while(next-heading>Math.PI/2)next-=Math.PI;
        while(next-heading<-Math.PI/2)next+=Math.PI;
        heading=next;
      }
      const along=dx*(-Math.sin(heading))+dy*Math.cos(heading);
      travel+=along;
      // Sample by distance, never by pointer-event count: slow and fast strokes transfer evenly.
      const steps=Math.max(1,Math.ceil(length/2.5));
      if(length>.3 || !last || event.type==='pointerdown')for(let i=1;i<=steps;i++){
        const px=previous.x+dx*i/steps,py=previous.y+dy*i/steps;
        const film=.38+.12*Math.sin((travel-length+length*i/steps)/34);
        ctx.save();ctx.translate(px,py);ctx.rotate(heading);
        ctx.globalAlpha=(pressed?.75:.48)*film;
        ctx.drawImage(stamp,-63,-6);ctx.restore();
      }
      last={x,y}; if(!pending)pending=requestAnimationFrame(publish);
      if(event.pointerType!=='touch'){
        cursor.classList.add('active');
        if(!cursor.classList.contains('brayer-3d'))cursor.style.transform=`translate(${event.clientX-41}px,${event.clientY-20}px) rotate(${heading*180/Math.PI}deg)`;
      }
      document.dispatchEvent(new CustomEvent('brayer-motion',{detail:{x:event.clientX,y:event.clientY,roll:along,angle:heading,pressure:pressed?1:.35}}));
      plate.dataset.inked='true';
    }
    plate.addEventListener('pointerenter',event=>{last=null;brush(event);});
    plate.addEventListener('pointermove',brush);
    plate.addEventListener('pointerdown',brush);
    plate.addEventListener('pointerup',brush);
    plate.addEventListener('pointerleave',()=>{last=null;cursor.classList.remove('active');});
    plate.addEventListener('pointercancel',()=>{last=null;cursor.classList.remove('active');});
    new ResizeObserver(size).observe(plate);size();
    return {all(){full=true;ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);publish();plate.dataset.inked='true';},clear(){full=false;ctx.clearRect(0,0,canvas.width,canvas.height);publish();delete plate.dataset.inked;last=null;}};
  });
  document.querySelector('#ink-all').addEventListener('click',()=>plates.forEach(p=>p.all()));
  document.querySelector('#ink-reset').addEventListener('click',()=>plates.forEach(p=>p.clear()));
  window.addEventListener('blur',()=>cursor.classList.remove('active'));
})();
