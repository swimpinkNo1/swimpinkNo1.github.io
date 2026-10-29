// Conservative sheet collision envelopes. Separation is resolved back-to-front,
// so a corrected lower sheet also supports every sheet above it in the same frame.
export function overlaps2D(a,b){return a.maxX>b.minX+.002&&b.maxX>a.minX+.002&&a.maxY>b.minY+.002&&b.maxY>a.minY+.002;}
export function resolvePaperStack(ordered,{bounds,raise,pin},gap=.035){
 const placed=[];
 for(const sheet of ordered){
  let box=bounds(sheet),floor=-Infinity;
  for(const lower of placed){
   if(!overlaps2D(box,lower.box))continue;
   floor=Math.max(floor,lower.box.maxZ+gap);
   const p=pin(lower.sheet);
   if(p.x>box.minX&&p.x<box.maxX&&p.y>box.minY&&p.y<box.maxY)floor=Math.max(floor,p.z+.085);
  }
  if(box.minZ<floor){raise(sheet,floor-box.minZ);box=bounds(sheet);}
  placed.push({sheet,box});
 }
 return placed;
}
