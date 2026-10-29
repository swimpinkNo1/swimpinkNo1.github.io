const records=await fetch('./commercial-cases.json',{cache:'no-store'}).then(r=>r.json());
const id=new URLSearchParams(location.search).get('case'),p=records[id];
if(!p){document.querySelector('#title').textContent='Case file unavailable';document.querySelector('.case-meta').hidden=true;}else{
 document.title=p.title+' — Invisiblepalmistry';
 for(const [key,value] of Object.entries({title:p.title,category:p.category,period:p.year||'From the 2010–2023 portfolio',role:p.role}))document.getElementById(key).textContent=value;
 const gallery=document.querySelector('#gallery');if(p.playbackNote){const note=document.createElement('p');note.className='source-note';note.textContent=p.playbackNote;gallery.before(note);}
 p.gallery.forEach((src,i)=>{const figure=document.createElement('figure'),link=document.createElement('a'),image=document.createElement('img'),caption=document.createElement('figcaption');image.src=src;image.alt=p.title+' — complete original artwork';image.width=1920;image.height=1080;image.loading=i?'lazy':'eager';link.href=src;link.target='_blank';link.rel='noopener';link.title='View full-size original';link.append(image);caption.textContent='View full-size original ↗ · 1920 × 1080';figure.append(link,caption);gallery.append(figure);});
 const notes=document.createElement('section');notes.className='case-notes';notes.setAttribute('aria-label','Original case description');
 for(const block of p.notes||[]){const paragraph=document.createElement('p');paragraph.textContent=block.text;notes.append(paragraph);}gallery.after(notes);
 if(p.videos?.length){
  const films=document.createElement('section');films.className='case-films';films.setAttribute('aria-label','Project films');
  const eyebrow=document.createElement('p');eyebrow.className='label';eyebrow.textContent='THE FILMS / '+String(p.videos.length).padStart(2,'0');films.append(eyebrow);
  p.videos.forEach((video,i)=>{
   const figure=document.createElement('figure'),heading=document.createElement('h2'),frame=document.createElement('iframe'),caption=document.createElement('figcaption'),link=document.createElement('a');
   heading.textContent=String(i+1).padStart(2,'0')+' / '+video.title;
   frame.src=video.src;frame.title=video.title;frame.loading='lazy';frame.allow='fullscreen';frame.allowFullscreen=true;frame.setAttribute('allowfullscreen','');
   link.href=video.src;link.target='_blank';link.rel='noopener';link.textContent='Open video in a new tab ↗';caption.append(link);figure.append(heading,frame,caption);films.append(figure);
  });gallery.after(films);
  document.querySelector('main > .source-note').textContent='Original artwork and case descriptions from YongHong Chen’s previous portfolio. Films are embedded from Xinpianchang.';
 }
}
