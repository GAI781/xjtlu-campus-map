import * as THREE from 'three';
import {OrbitControls} from './vendor/three/OrbitControls.js';
import {SVGRenderer} from './vendor/three/renderers/SVGRenderer.js';
import {F_GEOMETRY as G} from './f-geometry.js';

const host=document.querySelector('#model-host');
const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
const W=1000,H=838,S=.1;
const world=(p,y=0)=>new THREE.Vector3((p[0]-W/2)*S,y,(p[1]-H/2)*S);
const centre=points=>points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);
function shape(points,holes=[]){const s=new THREE.Shape(points.map(p=>new THREE.Vector2((p[0]-W/2)*S,-(p[1]-H/2)*S)));for(const h of holes)s.holes.push(new THREE.Path(h.map(p=>new THREE.Vector2((p[0]-W/2)*S,-(p[1]-H/2)*S))));return s;}

try{
 let renderer,software=false;
 const probe=document.createElement('canvas');
 if(probe.getContext('webgl2'))renderer=new THREE.WebGLRenderer({canvas:probe,antialias:true,alpha:true});
 else{renderer=new SVGRenderer();software=true;renderer.setQuality('high');host.classList.add('software-model');}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xf2f5fb,1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-label','F 栋一层三维剖切模型。拖动旋转，滚轮缩放；也可使用视角按钮。');
 renderer.domElement.setAttribute('role','img');host.appendChild(renderer.domElement);
 renderer.domElement.classList.add('model-render-surface');
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x99a9c7,software?0:2.1));if(software)scene.add(new THREE.AmbientLight(0x9ca2ae));
 const sunlight=new THREE.DirectionalLight(0xffffff,software?.65:1.3);sunlight.position.set(-45,100,60);scene.add(sunlight);
 const camera=new THREE.OrthographicCamera(-65,65,54,-54,.1,600);camera.position.set(-20,110,95);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.dampingFactor=.12;controls.minPolarAngle=.02;controls.maxPolarAngle=Math.PI*.43;controls.minZoom=.7;controls.maxZoom=9;controls.enablePan=true;controls.screenSpacePanning=true;
 const model=new THREE.Group();scene.add(model);
 const labels=document.createElement('div');labels.className='model-labels';host.appendChild(labels);
 const wallGroup=new THREE.Group();model.add(wallGroup);
 const roomObjects=new Map(),hitObjects=[],labelObjects=[];
 let active=false,picking=false,showLabels=true,sourceVisible=false,raf=0,animation=null,selected=null,width=1,height=1;
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
 const wallMaterial=material(0xffffff),edgeMaterial=new THREE.LineBasicMaterial({color:0xaebbd0,transparent:true,opacity:.35});
 function surface(points,color,elevation=.05,holes=[]){const geo=new THREE.ShapeGeometry(shape(points,holes));geo.rotateX(-Math.PI/2);const mesh=new THREE.Mesh(geo,material(color,{side:THREE.DoubleSide}));mesh.position.y=elevation;if(software)mesh.renderOrder=-10;model.add(mesh);return mesh;}
 function extrude(points,depth,color,base=0,holes=[]){const geo=new THREE.ExtrudeGeometry(shape(points,holes),{depth,bevelEnabled:false});geo.rotateX(-Math.PI/2);const mesh=new THREE.Mesh(geo,material(color));mesh.position.y=base;model.add(mesh);return mesh;}
 const slab=extrude(G.outline,.8,0xc7d3e5,-.85,[G.voidOutline]);
 const walking=surface(G.outline,0xfaf6ee,.005,[G.voidOutline]);walking.userData.kind='floor';hitObjects.push(walking);
 if(software){slab.renderOrder=-30;walking.renderOrder=-20;}
 const border=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(G.outline.map(p=>world(p,.03))),new THREE.LineBasicMaterial({color:0x9daec6}));model.add(border);
 const atrium=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(G.voidOutline.map(p=>world(p,.04))),new THREE.LineBasicMaterial({color:0x94aab7}));model.add(atrium);
 // A recess makes the photographed void legible; no ground-floor surface is invented inside it.
 function wall(a,b,roomGroup){const v1=world(a),v2=world(b),length=v1.distanceTo(v2);if(length<.03)return;const m=new THREE.Mesh(new THREE.BoxGeometry(length,1,.23),wallMaterial);m.position.copy(v1.clone().add(v2).multiplyScalar(.5));m.position.y=.5;m.rotation.y=-Math.atan2(v2.z-v1.z,v2.x-v1.x);roomGroup.add(m);const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),edgeMaterial);m.add(e);}
 function walls(r){const group=new THREE.Group();group.scale.y=1.7;wallGroup.add(group);r.points.forEach((a,i)=>{const b=r.points[(i+1)%r.points.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);const openings=(r.doors||[]).filter(d=>d.edge===i).map(d=>[Math.max(0,d.t-d.width/len/2),Math.min(1,d.t+d.width/len/2)]).sort((a,b)=>a[0]-b[0]);const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];let from=0;for(const [lo,hi]of openings){if(lo>from)wall(at(from),at(lo),group);from=Math.max(from,hi);}if(from<1)wall(at(from),b,group);});return group;}
 function label(text,p,kind,action){const el=document.createElement(action?'button':'span');el.className='model-label '+kind;el.textContent=text;if(action){el.type='button';el.onclick=e=>{e.stopPropagation();action();};}labels.appendChild(el);const item={el,p:world(p,2.2),kind};labelObjects.push(item);return item;}
 for(const r of G.rooms){const fill=surface(r.points,r.uncertain?0xf0d9aa:0xdce7f5,.065);fill.userData={kind:'room',room:r};hitObjects.push(fill);const group=walls(r);const c=centre(r.points);const l=label(r.uncertain?'?':r.id.replace('F-',''),c,r.uncertain?'uncertain':'room',()=>r.uncertain?emit('f-model-issue',r.issue):emit('f-model-select',r.id));l.id=r.id;l.el.setAttribute('aria-label',r.uncertain?'待核对：'+r.sourceLabel:'查看 '+r.id);roomObjects.set(r.id,{fill,group,label:l,data:r});}
 for(const r of G.service){surface(r.points,r.label==='卫生间'?0xc9e5df:0xe2e4ef,.07);walls({...r,doors:[]});label(r.label==='卫生间'?'WC':'辅助',centre(r.points),'service',()=>emit('f-model-source',r.page));}
 for(const r of G.stairs){const m=surface(r.points,0xbecbdc,.09);m.userData={kind:'source',page:r.page};hitObjects.push(m);const p=r.points;if(p.length===4){for(let i=1;i<9;i++){const t=i/9,a=[p[0][0]+(p[3][0]-p[0][0])*t,p[0][1]+(p[3][1]-p[0][1])*t],b=[p[1][0]+(p[2][0]-p[1][0])*t,p[1][1]+(p[2][1]-p[1][1])*t];model.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([world(a,.12),world(b,.12)]),new THREE.LineBasicMaterial({color:0x6b81a1})));}}label('↗',centre(r.points),'facility',()=>emit('f-model-source',r.page));}
 for(const r of G.lifts){const m=extrude(r.points,.9,0xa0b9d9,.05);m.userData={kind:'source',page:r.page};hitObjects.push(m);label('↕',centre(r.points),'facility',()=>emit('f-model-source',r.page));}
 label('中庭 · 中空',[741,304],'void');
 for(const r of G.entrances){const m=new THREE.Mesh(new THREE.ConeGeometry(.6,1.5,3),material(0x4d9e8e));m.rotation.x=Math.PI/2;m.position.copy(world([r.x,r.y],.18));model.add(m);}
 const outlineSelected=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x2c60d8}));model.add(outlineSelected);
 const markerGroup=new THREE.Group();scene.add(markerGroup);
 const overlayGeo=new THREE.ShapeGeometry(shape(G.outline,[G.voidOutline]));const pos=overlayGeo.attributes.position,uv=overlayGeo.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+50)/100,(pos.getY(i)+41.9)/83.8);overlayGeo.rotateX(-Math.PI/2);
 const overlay=new THREE.Mesh(overlayGeo,new THREE.MeshBasicMaterial({transparent:true,opacity:.83,side:THREE.DoubleSide,depthWrite:false}));overlay.position.y=.15;overlay.visible=false;model.add(overlay);
 if(!software)new THREE.TextureLoader().load('./f-assets/plan-01.webp',texture=>{texture.colorSpace=THREE.SRGBColorSpace;overlay.material.map=texture;overlay.material.needsUpdate=true;kick();});
 function softwareSource(){if(!software||!sourceVisible)return;const ns='http://www.w3.org/2000/svg',wrap=document.createElementNS(ns,'g');const project=p=>{const v=world(p,.15).project(camera);return [v.x*width/2,-v.y*height/2];};const a=project([0,0]),b=project([1000,0]),c=project([0,838]);wrap.setAttribute('transform',`matrix(${(b[0]-a[0])/1000} ${(b[1]-a[1])/1000} ${(c[0]-a[0])/838} ${(c[1]-a[1])/838} ${a[0]} ${a[1]})`);wrap.setAttribute('pointer-events','none');const clip=document.createElementNS(ns,'clipPath');clip.id='model-photo-clip';const path=document.createElementNS(ns,'path');path.setAttribute('d',[G.outline,G.voidOutline].map(p=>'M'+p.map(v=>v.join(',')).join('L')+'Z').join(''));path.setAttribute('clip-rule','evenodd');clip.appendChild(path);wrap.appendChild(clip);const img=document.createElementNS(ns,'image');img.setAttribute('href','./f-assets/plan-01.webp');img.setAttribute('width','1000');img.setAttribute('height','838');img.setAttribute('opacity','.62');img.setAttribute('clip-path','url(#model-photo-clip)');wrap.appendChild(img);renderer.domElement.appendChild(wrap);}
 function updateLabels(){const taken=[];const ordered=[...labelObjects].sort((a,b)=>(b.id===selected)-(a.id===selected));for(const l of ordered){const v=l.p.clone().project(camera),x=(v.x+1)*width/2,y=(1-v.y)*height/2,important=l.id===selected||l.kind==='void';let visible=(showLabels||important)&&v.z>-1&&v.z<1&&x>12&&x<width-12&&y>12&&y<height-12;const half=l.kind==='room'?22:l.kind==='void'?43:13;const box=[x-half,y-9,x+half,y+9];if(visible&&!important&&taken.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1]))visible=false;if(visible)taken.push(box);l.el.hidden=!visible;l.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;}}
 function tick(time){raf=0;if(!active)return;let moving=false;if(animation){const duration=matchMedia('(prefers-reduced-motion:reduce)').matches?1:550;const t=Math.min(1,(time-animation.start)/duration),e=1-(1-t)**3;camera.position.lerpVectors(animation.a,animation.b,e);controls.target.lerpVectors(animation.ta,animation.tb,e);camera.zoom=animation.za+(animation.zb-animation.za)*e;camera.updateProjectionMatrix();moving=t<1;if(!moving)animation=null;}const changed=controls.update();renderer.render(scene,camera);softwareSource();updateLabels();if(moving||changed)kick();}
 function kick(){if(active&&!raf)raf=requestAnimationFrame(tick);}
 controls.addEventListener('change',kick);controls.addEventListener('start',()=>{animation=null;});
 function moveTo(target,zoom,direction){const offset=direction||camera.position.clone().sub(controls.target);animation={start:performance.now(),a:camera.position.clone(),b:target.clone().add(offset),ta:controls.target.clone(),tb:target.clone(),za:camera.zoom,zb:zoom};kick();}
 function fit(){moveTo(new THREE.Vector3(0,0,0),1,new THREE.Vector3(-16,110,90));}
 function resize(){width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height);const aspect=width/height;const v=Math.max(53,57/aspect);camera.left=-v*aspect;camera.right=v*aspect;camera.top=v;camera.bottom=-v;camera.updateProjectionMatrix();kick();}
 new ResizeObserver(resize).observe(host);
 let down=null;const raycaster=new THREE.Raycaster();
 renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;down=null;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/width*2-1,-(e.clientY-rect.top)/height*2+1),camera);const hits=raycaster.intersectObjects(picking?[walking]:hitObjects,false);if(!hits.length)return;const hit=hits[0];if(picking){emit('f-model-position',{x:Math.round(hit.point.x/S+500),y:Math.round(hit.point.z/S+419)});return;}const d=hit.object.userData;if(d.kind==='room')d.room.uncertain?emit('f-model-issue',d.room.issue):emit('f-model-select',d.room.id);if(d.kind==='source')emit('f-model-source',d.page);});
 const api={
  setActive(value){active=value;host.hidden=!value;if(!value){cancelAnimationFrame(raf);raf=0;}else{resize();kick();}},
  setSelected(id){selected=id;for(const [key,r]of roomObjects){const yes=key===id;r.fill.material.color.setHex(yes?0x7da6f6:r.data.uncertain?0xf0d9aa:0xdce7f5);r.label.el.classList.toggle('selected',yes);}const r=roomObjects.get(id);outlineSelected.visible=!!r;if(r){outlineSelected.geometry.dispose();outlineSelected.geometry=new THREE.BufferGeometry().setFromPoints(r.data.points.map(p=>world(p,.18)));}kick();},
  focus(id){const r=roomObjects.get(id);if(!r)return;moveTo(world(centre(r.data.points)),2.5);},
  fit,zoom(factor){animation=null;camera.zoom=Math.max(.7,Math.min(9,camera.zoom/factor));camera.updateProjectionMatrix();kick();},
  setLabels(value){showLabels=value;kick();},setPicking(value){picking=value;host.classList.toggle('pick-mode',value);},
  setTopView(){moveTo(controls.target.clone(),camera.zoom,new THREE.Vector3(0,145,.1));},
  rotate(){const offset=camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4);moveTo(controls.target.clone(),camera.zoom,offset);},
  setWallHeight(low){wallGroup.children.forEach(g=>g.scale.y=low?1.7:3.5);kick();},setSource(on){sourceVisible=on;overlay.visible=!software&&on;kick();},
  setMarkers(origin,destination){while(markerGroup.children.length){const m=markerGroup.children[0];markerGroup.remove(m);m.geometry.dispose();m.material.dispose();}for(const [r,color]of [[origin,0x258779],[destination,0x3265d8]])if(r?.floor==='1F'){const m=new THREE.Mesh(new THREE.CylinderGeometry(.65,.65,2.8,20),material(color));m.position.copy(world([r.x,r.y],1.6));markerGroup.add(m);}kick();}
 };
 document.querySelector('#model-top').onclick=()=>api.setTopView();document.querySelector('#model-orbit').onclick=()=>api.rotate();document.querySelector('#model-angle').onclick=()=>api.fit();document.querySelector('#model-low').onchange=e=>api.setWallHeight(e.target.checked);document.querySelector('#model-source').onchange=e=>api.setSource(e.target.checked);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();emit('f-model-error');});
 emit('f-model-ready',api);
}catch(error){console.error('F model initialization failed',error);emit('f-model-error');}
