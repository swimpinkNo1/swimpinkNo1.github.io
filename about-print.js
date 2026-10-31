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
    let last = null, pending = 0, full = false;
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
      const previous=last || {x,y};
      ctx.strokeStyle='#000';ctx.lineWidth=54;ctx.lineCap='square';
      ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(x,y);ctx.stroke();
      ctx.fillStyle='#000';ctx.fillRect(x-28,y-12,56,24);
      last={x,y}; if(!pending)pending=requestAnimationFrame(publish);
      if(event.pointerType!=='touch'){
        cursor.classList.add('active');
        const lean=Math.max(-12,Math.min(12,(x-previous.x)*.3));
        cursor.style.transform=`translate(${event.clientX-41}px,${event.clientY-20}px) rotate(${lean}deg)`;
      }
      plate.dataset.inked='true';
    }
    plate.addEventListener('pointerenter',event=>{last=null;brush(event);});
    plate.addEventListener('pointermove',brush);
    plate.addEventListener('pointerdown',brush);
    plate.addEventListener('pointerleave',()=>{last=null;cursor.classList.remove('active');});
    plate.addEventListener('pointercancel',()=>{last=null;cursor.classList.remove('active');});
    new ResizeObserver(size).observe(plate);size();
    return {all(){full=true;ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);publish();plate.dataset.inked='true';},clear(){full=false;ctx.clearRect(0,0,canvas.width,canvas.height);publish();delete plate.dataset.inked;last=null;}};
  });
  document.querySelector('#ink-all').addEventListener('click',()=>plates.forEach(p=>p.all()));
  document.querySelector('#ink-reset').addEventListener('click',()=>plates.forEach(p=>p.clear()));
  window.addEventListener('blur',()=>cursor.classList.remove('active'));
})();
