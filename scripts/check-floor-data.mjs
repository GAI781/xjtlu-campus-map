import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../dist/',import.meta.url),context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('f-data.js',root),'utf8')+';globalThis.data=F_DATA;',context);
let count=0,polygons=0;
const catalog={B:['1F','2F','3F','4F','5F'],F:['BF','1F','2F','3F','4F','5F'],G:['BF','1F','2F','3F','4F','5F']};
for(const [b,floors] of Object.entries(catalog))for(const f of floors){
 const d=JSON.parse(fs.readFileSync(new URL(`indoor/${b.toLowerCase()}-${f}.json`,root)));
 assert.equal(d.building,b);assert.equal(d.floor,f);assert.equal(d.width,1000);assert(d.height>0);
 const rooms=b==='F'?context.data.rooms.filter(r=>r.floor===f).map(r=>({...r,...d.rooms.find(s=>s.id===r.id),x:r.x,y:r.y})):d.rooms;
 assert.equal(new Set(rooms.map(r=>r.id)).size,rooms.length,`${b} ${f}: duplicate id`);
 assert(fs.existsSync(new URL(d.image,root)),`${b} ${f}: missing diagram`);
 for(const p of d.sourcePages)assert(fs.existsSync(new URL(`${b.toLowerCase()}-assets/source-${String(p).padStart(2,'0')}.jpg`,root)));
 for(const r of rooms){assert(Number.isFinite(r.x)&&Number.isFinite(r.y),r.id+': missing coordinates');if(r.points){assert(r.points.length>=3);for(const p of r.points)assert(p.length===2&&p.every(Number.isFinite));polygons++;}}
 assert(d.outlines.length>0);for(const o of d.outlines)for(const p of [o.points,...(o.holes||[])]){assert(p.length>=3);for(const xy of p)assert(xy.length===2&&xy.every(Number.isFinite));}
 count+=rooms.length;console.log(`${b} ${f}: ${rooms.length} indexed / ${rooms.filter(r=>r.points).length} polygons`);
}
console.log(JSON.stringify({floors:17,records:count,polygons}));
