import fs from 'node:fs';
import vm from 'node:vm';
import {F_GEOMETRY} from '../dist/f-geometry.js';
const context=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../dist/f-data.js',import.meta.url),'utf8')+';globalThis.data=F_DATA;',context);
const data=context.data,g=F_GEOMETRY;
const d={building:'F',floor:'1F',width:1000,height:838,image:'f-assets/plan-01.webp',sourcePages:g.sourcePages,outlines:[{points:g.outline,holes:[g.voidOutline]}],rooms:g.rooms.filter(r=>!r.uncertain),walls:[],notes:[...g.notes,...data.issues.filter(i=>i.floor==='1F').map(i=>i.detail)]};
for(const a of [...g.service,...g.stairs,...g.lifts])a.points.forEach((p,i)=>d.walls.push([p,a.points[(i+1)%a.points.length]]));
fs.writeFileSync(new URL('../dist/indoor/f-1F.json',import.meta.url),JSON.stringify(d,null,2));
