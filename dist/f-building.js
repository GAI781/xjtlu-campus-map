'use strict';
(() => {
 const $=s=>document.querySelector(s), data=F_DATA, floors=data.floors, rooms=data.rooms;
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalize=s=>s.normalize('NFKC').toUpperCase().replace(/[\s._—–-]/g,'');
 const photo=p=>`f-assets/source-${String(p).padStart(2,'0')}.jpg`;
 const plan=f=>`f-assets/plan-${String(f.page).padStart(2,'0')}.webp`;
 const getRoom=id=>rooms.find(r=>r.id===id);
 const params=new URLSearchParams(location.search);
 let floorId=floors.some(f=>f.id===(params.get('floor')||'').toUpperCase())?params.get('floor').toUpperCase():'1F';
 let selected=getRoom(params.get('room'))||rooms.find(r=>r.floor===floorId&&r.id==='F-1021')||rooms.find(r=>r.floor===floorId);
 let scope='floor',showPoints=true,tilted=false,picking=false,origin=null,destination=null,sourcePage=1,photoScale=100,noticeTimer;
 let model=null,modelMode=true,modelFailed=false;
 const wantsModel=()=>floorId==='1F'&&modelMode&&!modelFailed;
 let saved=read('f-building-favorites',[]),notes=read('f-building-review',{});
 if(!Array.isArray(saved))saved=[];saved=saved.filter(id=>getRoom(id));
 if(!notes||Array.isArray(notes)||typeof notes!=='object')notes={};
 const svg=$('#floor-map'); let view={x:0,y:0,w:1000,h:838};
 function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
 function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{notice('浏览器无法保存；请先导出记录以免丢失。');return false}}
 function notice(message){$('#notice').textContent=message;$('#notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').hidden=true,4800)}
 function currentFloor(){return floors.find(f=>f.id===floorId)}
 function applyView(){svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`)}
 function fit(){const f=currentFloor();view={x:-35,y:-30,w:1070,h:f.height+60};applyView();if(wantsModel())model?.fit()}
 function zoom(factor,center){const f=currentFloor(),oldW=view.w;view.w=Math.max(150,Math.min(2200,view.w*factor));const ratio=view.w/oldW;view.h*=ratio;const cx=center?.x??view.x+oldW/2,cy=center?.y??view.y+view.h/ratio/2;view.x=cx-(cx-view.x)*ratio;view.y=cy-(cy-view.y)*ratio;applyView()}
 function focusRoom(r){if(wantsModel()&&model){model.focus(r.id);return}view={x:r.x-220,y:r.y-190,w:440,h:380};applyView()}
 function floorNavigation(){
  $('#floor-nav').innerHTML=floors.map(f=>`<button data-floor="${f.id}" class="${f.id===floorId?'active':''}" aria-current="${f.id===floorId?'true':'false'}">${f.id}</button>`).join('');
 }
 function renderList(){
  const query=$('#room-search').value.trim(),q=normalize(query);
  const matches=rooms.filter(r=>(query||scope==='all'||(scope==='saved'?saved.includes(r.id):r.floor===floorId))&&(!q||normalize(r.id).includes(q)||normalize(r.label).includes(q)));
  $('#list-caption').textContent=query?'全楼搜索结果':scope==='saved'?'已收藏房间':scope==='all'?'全楼已录入房间':`${floorId} · 已录入房间`;
  $('#list-count').textContent=matches.length+' 个';
  $('#room-list').innerHTML=matches.length?matches.map(r=>`<button class="room-row ${r.id===selected?.id?'active':''}" data-room="${r.id}" aria-pressed="${r.id===selected?.id}"><span class="row-icon">${r.floor}</span><span class="row-text"><b>${r.id}${saved.includes(r.id)?' ☆':''}</b><small>${r.floor} · ${escape(r.label)}</small></span><span class="row-arrow">›</span></button>`).join(''):`<div class="empty">${scope==='saved'&&!query?'还没有收藏。选一个房间，点击星标。':'没有匹配的已录入记录。<br>未录入不代表房间不存在；请查看原图或待核对事项。'}</div>`;
 }
 function renderDetail(){
  if(!selected)return;
  const r=selected;$('#room-detail').innerHTML=`<h3 class="place-number">${r.id}</h3><p class="place-name">${escape(r.label)}</p><div class="place-meta"><span>${r.floor}</span><span>${r.id.startsWith('EF')?'EF 连接区':r.id.startsWith('FG')?'FG 连接区':'F 栋'}</span><span>图面可辨</span></div><p class="source-note">来源：照片.pdf · 第 ${r.page} 页<br>位置按原图标注，尚未实地核验。${r.label==='用途待确认'?'图例未逐间指定用途。':''}</p>`;
  $('#favorite-room').textContent=saved.includes(r.id)?'★':'☆';$('#favorite-room').classList.toggle('saved',saved.includes(r.id));$('#favorite-room').setAttribute('aria-label',saved.includes(r.id)?'取消收藏房间':'收藏房间');$('#favorite-room').setAttribute('aria-pressed',String(saved.includes(r.id)));
 }
 function marker(x,y,text,color){const label=escape(text);return `<g class="selected-marker" transform="translate(${x} ${y})"><circle r="20" fill="${color}" opacity=".12"/><circle r="9" fill="${color}" stroke="white" stroke-width="3"/><g transform="translate(0 -37)"><rect x="-63" y="-16" width="126" height="28" rx="7" fill="${color}"/><text text-anchor="middle" y="3" fill="white" font-size="13" font-family="sans-serif">${label}</text><path d="M-5 12 0 17 5 12" fill="${color}"/></g></g>`}
 function drawMap(){
  model?.setSelected(selected?.floor==='1F'?selected.id:null);model?.setLabels(showPoints);model?.setMarkers(origin,destination);
  const f=currentFloor();
  const shapeMarkup=f.id==='1F'?Object.entries(data.shapes).map(([id,points])=>`<polygon class="room-shape ${id===selected?.id?'selected-shape':''}" points="${points.map(p=>p.join(',')).join(' ')}"/>`).join(''):'';
  const pins=showPoints?rooms.filter(r=>r.floor===floorId).map(r=>`<circle class="room-pin" cx="${r.x}" cy="${r.y}" r="6" data-map-room="${r.id}" tabindex="0" role="button" aria-label="查看 ${r.id}"><title>${r.id} · ${escape(r.label)}</title></circle>`).join(''):'';
  const issues=data.issues.filter(i=>i.floor===floorId).map(i=>`<g class="issue-map-pin" transform="translate(${i.x} ${i.y})" data-map-issue="${i.id}" role="button" tabindex="0" aria-label="待核对：${escape(i.title)}"><circle r="12"/><text y="1">?</text></g>`).join('');
  svg.innerHTML=`<title>${floorId} 实拍图纸及房间位置</title><image href="${plan(f)}" x="0" y="0" width="1000" height="${f.height}" preserveAspectRatio="none"/>${shapeMarkup}${pins}${issues}${selected?.floor===floorId?marker(selected.x,selected.y,selected.id,'#3265d8'):''}${destination?.floor===floorId&&destination.id!==selected?.id?marker(destination.x,destination.y,'终点 '+destination.id,'#3265d8'):''}${origin?.floor===floorId?marker(origin.x,origin.y,'起点 · 手动确认','#258779'):''}`;
  svg.setAttribute('aria-label',`F 栋 ${floorId} 实拍平面图与房间位置；可拖动、缩放。`);
 }
 function selectRoom(id,focus=false){const r=getRoom(id);if(!r)return;const changed=r.floor!==floorId;selected=r;if(changed)setFloor(r.floor,true);else{drawMap();renderList();renderDetail()}if(focus)focusRoom(r);const url=new URL(location);url.searchParams.set('floor',r.floor);url.searchParams.set('room',r.id);url.searchParams.delete('q');history.replaceState(null,'',url);}
 function setFloor(id,keepSelected=false){
  if(!floors.some(f=>f.id===id))return;floorId=id;picking=false;updateMode();
  if(!keepSelected||selected.floor!==id)selected=rooms.find(r=>r.floor===id);
  const f=currentFloor();$('#floor-title').textContent=id==='1F'?'一层，立体认识每个空间。':f.title+'，找到你的目的地。';$('#map-floor').textContent=id;$('#map-subtitle').textContent=f.description;$('#watermark').textContent=id==='BF'?'B1':'0'+id[0];$('#floor-note').textContent=f.note;
  floorNavigation();fit();drawMap();renderList();renderDetail();renderJourney();
  const url=new URL(location);url.searchParams.set('floor',id);if(selected)url.searchParams.set('room',selected.id);history.replaceState(null,'',url);
 }
 function renderJourney(){
  $('#origin-label').textContent=origin?`${origin.floor} · ${origin.id||'图上手动标记'}`:'还未设置起点';
  $('#destination-label').textContent=destination?`${destination.floor} · ${destination.id}`:'还未选择目的地';
  $('#clear-position').hidden=!origin&&!destination;
  $('#route-status').textContent=origin&&destination?(origin.floor!==destination.floor?'起终点不在同层。楼梯、电梯对应关系待复核，尚不能给出跨层路径。':origin.id===destination.id?'起点和目的地为同一房间。手动位置不是实时定位。':'已标出同层起终点。门口及可通行走廊未完成实地核验，暂不生成路线。'):'核实走廊、门口与跨层连接后开放路线。当前仅对照位置，不生成引导线。';
 }
 function updateMode(){
  const show=wantsModel();tilted=false;$('#map-stage').classList.remove('tilt');$('#map-stage').classList.toggle('picking',picking);$('#map-stage').classList.toggle('is-model',show);
  $('#floor-map').style.display=show?'none':'';$('#model-host').hidden=!show||!model;$('#model-loading').hidden=!show||!!model;$('#model-tools').hidden=!show;$('#watermark').hidden=show;
  model?.setActive(show);model?.setPicking(picking);
  $('#flat-view').classList.toggle('active',!show);$('#tilt-view').classList.toggle('active',show);$('#flat-view').setAttribute('aria-pressed',String(!show));$('#tilt-view').setAttribute('aria-pressed',String(show));$('#tilt-view').disabled=floorId!=='1F'||modelFailed;$('#tilt-view').title=floorId==='1F'?'一层三维剖切模型':'本层尚未描摹三维模型，请使用原图';
  $('#mode-tip').hidden=!picking;$('#mode-tip').textContent='点击你在图上的位置 · 再点按钮可取消';$('#pick-position').textContent=picking?'取消标记':'在图上标记我';
  $('#show-labels').textContent=(show?'房间编号 ':'位置点 ')+(showPoints?'开':'关');
  $('#map-footnote').textContent=show?'按展示牌描摹的 1F 三维剖切试点 · 墙高为示意，门洞及尺寸待实测。拖动旋转，滚轮或双指缩放。':'原图保留完整细节。位置点不代表门口；红色图钉是展示牌所在位置。本层三维模型'+(floorId==='1F'?'可在上方切换。':'尚未制作。');
 }
 function modal(title,html,eyebrow='F BUILDING · FIELD NOTES'){$('#modal-eyebrow').textContent=eyebrow;$('#modal-body').innerHTML=`<h2 class="modal-title">${title}</h2>${html}`;if(!$('#modal').open)$('#modal').showModal();$('#modal').scrollTop=0;}
 function source(p){
  sourcePage=p;photoScale=100;const f=floors.find(f=>f.pages.includes(p));
  modal(`每个位置，都有出处。`,`<p class="modal-intro">照片.pdf · ${f.id} · 第 ${p} / 28 页。可放大阅读；图中红色图钉不是你的实时位置。</p><div class="source-tools"><label>跳到 <select id="photo-select" aria-label="选择原始照片">${floors.map(f=>`<optgroup label="${f.id}">${f.pages.map(n=>`<option value="${n}" ${n===p?'selected':''}>第 ${n} 页${n===f.page?' · 总览':' · 局部'}</option>`).join('')}</optgroup>`).join('')}</select></label><button id="photo-minus">缩小</button><button id="photo-fit">适合宽度</button><button id="photo-plus">放大</button><a class="light-button" href="${photo(p)}" target="_blank" rel="noopener">打开原始照片 ↗</a></div><div class="photo-viewport"><img id="source-image" src="${photo(p)}" alt="照片.pdf 第 ${p} 页，${f.id} 楼层展示牌"></div><div class="photo-pages">${f.pages.map(n=>`<button data-photo="${n}" class="${n===p?'active':''}">第 ${n} 页</button>`).join('')}</div>`,'SOURCE PHOTOGRAPHS · 28 PAGES');
  $('#photo-select').onchange=e=>source(+e.target.value);$('#photo-plus').onclick=()=>scalePhoto(50);$('#photo-minus').onclick=()=>scalePhoto(-50);$('#photo-fit').onclick=()=>{photoScale=100;$('#source-image').style.width='100%'};
 }
 function scalePhoto(delta){photoScale=Math.max(50,Math.min(400,photoScale+delta));$('#source-image').style.width=photoScale+'%'}
 function reviews(focusId){
  modal('不确定的地方，一起核对。',`<p class="modal-intro">以下问题尚未解决。填写实际门牌、通行情况或照片说明，再导出交给项目发起人。记录只保存在当前浏览器，不会自动修改公开地图。</p><div class="review-toolbar"><button id="export-review" class="primary-button">导出复核记录 JSON ↓</button><button id="export-rooms">导出已录入房间 JSON ↓</button></div><div class="review-list">${data.issues.map(i=>`<article class="issue" id="issue-${i.id}"><span class="issue-tag">${i.id} / ${i.floor} / 第 ${i.page} 页 · 待复核</span><h3>${escape(i.title)}</h3><p>${escape(i.detail)}</p><label><span class="sr-label">你的核对记录</span><textarea data-note="${i.id}" aria-label="${escape(i.title)}：核对记录" placeholder="例如：门牌实际为…；拍摄日期…；门禁情况…">${escape(typeof notes[i.id]?.text==='string'?notes[i.id].text:'')}</textarea></label><div class="issue-actions"><button data-save-note="${i.id}">保存记录</button><button data-photo="${i.page}">查看原图 ↗</button><button data-locate-issue="${i.id}">查看图上位置</button></div><div class="saved-note" id="saved-${i.id}">${notes[i.id]?.text?'已有本地记录 · 尚未更改地图':''}</div></article>`).join('')}</div>`);
  $('#export-review').onclick=()=>{flushNotes();download('F-building-review.json',{schemaVersion:1,building:'F',source:'照片.pdf',exportedAt:new Date().toISOString(),issues:data.issues.map(i=>({...i,review:notes[i.id]||null,status:'awaiting-verification'}))})};
  $('#export-rooms').onclick=()=>download('F-building-room-index.json',{schemaVersion:1,building:'F',source:'照片.pdf',coordinates:'cropped photograph; 1000 image-space units wide; not metres or door positions',fieldVerified:false,floors,rooms});
  if(focusId)$('#issue-'+focusId)?.scrollIntoView({block:'center'});
 }
 function saveNote(id){const el=$(`[data-note="${id}"]`);if(!el)return;notes[id]={text:el.value,updatedAt:new Date().toISOString()};const ok=persist('f-building-review',notes);$('#saved-'+id).textContent=ok?'已保存在本浏览器 · 尚未更改地图':'仅在本次访问中保存，请导出';}
 function flushNotes(){document.querySelectorAll('[data-note]').forEach(el=>{const id=el.dataset.note;if(el.value!==notes[id]?.text){notes[id]={text:el.value,updatedAt:new Date().toISOString()}}});persist('f-building-review',notes)}
 function download(name,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('已生成下载文件。')}
 function overview(){modal('六层空间，一次认识。',`<p class="modal-intro">每张卡片均来自对应楼层展示牌。各照片独立拍摄，缩放与透视不同；这里不将它们伪装成已精确对齐的三维建筑。</p><div class="overview-grid">${floors.map(f=>`<button class="floor-preview" data-overview-floor="${f.id}"><img src="${plan(f)}" alt="${f.id} 原图平面布局" loading="lazy"><b>${f.id} · ${f.title}</b><small>${f.description}<br>${rooms.filter(r=>r.floor===f.id).length} 个房间位置已录入 · 查看本层 →</small></button>`).join('')}</div>`,'FLOOR ATLAS · BF—5F')}
 function info(){modal('真实数据，清晰边界。',`<p class="modal-intro">这一版加入了 1F 三维剖切模型。F 栋身份已经由你确认；所有位置都回溯到照片，没有按编号规律生成房间。</p><table class="info-table"><tbody><tr><td>资料覆盖</td><td>6 层、28 张照片；${rooms.length} 个可辨认房间点位。索引尚未穷尽附属小房间；完整布局可在原图查看。</td></tr><tr><td>空间表达</td><td>1F 按照片描摹 37 个已录入房间与 4 个待核对空间，独立建立房间地面、矮墙与可辨门洞；中庭留空，楼梯、电梯和辅助空间按图示表达。其余楼层保留原图查询。</td></tr><tr><td>建模精度</td><td>模型按照片坐标描摹，保留拍摄透视，未获得比例尺、实测尺寸与层高。墙高、厚度、楼梯踏步为示意；门洞位置近似，附属隔间合并表达；不作测量或现场通行依据。</td></tr><tr><td>导航状态</td><td>已支持手动起点和房间目的地位置对照。暂无可通行路线网络、自动室内定位、跨层指路、距离或到达时间计算。</td></tr><tr><td>信息置信度</td><td>“图面可辨”指能从照片读到编号与位置，不代表已与现场逐一核对。房间用途只在图例明确对应时填写。</td></tr><tr><td>本地保存</td><td>收藏与复核笔记仅保存在当前浏览器，可导出复核 JSON 交给发起人。尚无服务器协作或课表导入功能。</td></tr></tbody></table><div class="note-box">下一步需要：冲突门牌的实拍、楼梯与电梯编号及停靠楼层、入口与门禁信息、带尺寸平面图和各层层高。完成现场核验后再建立导航路径。</div>`,'DATA & MODEL · V0.6')}
 $('#floor-nav').onclick=e=>{const b=e.target.closest('[data-floor]');if(b){if(b.dataset.floor==='1F'){location.href='f-building.html';return}setFloor(b.dataset.floor)}};
 $('#room-list').onclick=e=>{const b=e.target.closest('[data-room]');if(b)selectRoom(b.dataset.room,true)};
 $('#room-search').oninput=renderList;$('#room-search').onkeydown=e=>{if(e.key==='Enter'){const first=$('#room-list [data-room]');if(first){selectRoom(first.dataset.room,true);$('#room-search').blur()}}};
 document.querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>{scope=b.dataset.scope;document.querySelectorAll('[data-scope]').forEach(el=>el.classList.toggle('active',el===b));renderList()});
 $('#favorite-room').onclick=()=>{const id=selected.id;saved=saved.includes(id)?saved.filter(s=>s!==id):[...saved,id];persist('f-building-favorites',saved);renderDetail();renderList()};
 $('#set-destination').onclick=()=>{destination={...selected};renderJourney();drawMap();notice(`已将 ${selected.id} 设为目的地。路线仍待核验。`)};
 $('#use-room').onclick=()=>{origin={...selected};renderJourney();drawMap();notice('已按你手动选择的房间设置起点。')};
 $('#pick-position').onclick=()=>{picking=!picking;if(picking)tilted=false;updateMode();if(picking)$('#map-stage').scrollIntoView({block:'center',behavior:'smooth'})};
 $('#clear-position').onclick=()=>{origin=destination=null;picking=false;updateMode();renderJourney();drawMap()};
 $('#flat-view').onclick=()=>{modelMode=false;picking=false;updateMode()};$('#tilt-view').onclick=()=>{modelMode=true;picking=false;updateMode()};$('#overview-view').onclick=overview;
 $('#show-labels').onclick=()=>{showPoints=!showPoints;$('#show-labels').setAttribute('aria-pressed',String(showPoints));updateMode();drawMap()};
 $('#zoom-in').onclick=()=>wantsModel()?model?.zoom(.75):zoom(.75);$('#zoom-out').onclick=()=>wantsModel()?model?.zoom(1.3):zoom(1.3);$('#zoom-reset').onclick=fit;
 window.addEventListener('f-model-ready',e=>{model=e.detail;updateMode();drawMap();if(params.get('room')&&floorId==='1F')model.focus(selected.id)});
 window.addEventListener('f-model-error',()=>{modelFailed=true;updateMode();notice('此浏览器暂时无法显示 3D，已切回原图核对。')});
 window.addEventListener('f-model-select',e=>selectRoom(e.detail,true));window.addEventListener('f-model-issue',e=>reviews(e.detail));window.addEventListener('f-model-source',e=>source(e.detail));
 window.addEventListener('f-model-position',e=>{origin={floor:'1F',...e.detail};picking=false;updateMode();renderJourney();drawMap();notice('手动起点已标记；它不会随你移动。')});
 function svgPoint(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())}
 let drag=null;
 svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=svgPoint(e);drag={x:e.clientX,y:e.clientY,p,view:{...view},target:e.target,moved:false};svg.setPointerCapture(e.pointerId)});
 svg.addEventListener('pointermove',e=>{if(!drag||picking||tilted)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;if(!drag.moved)return;const p=svgPoint(e);view.x+=drag.p.x-p.x;view.y+=drag.p.y-p.y;applyView()});
 svg.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;if(d.moved||Math.hypot(e.clientX-d.x,e.clientY-d.y)>6)return;if(picking){const p=svgPoint(e),f=currentFloor();if(p.x<0||p.y<0||p.x>1000||p.y>f.height){notice('请在图纸范围内标记。');return}origin={floor:floorId,x:Math.round(p.x),y:Math.round(p.y)};picking=false;updateMode();renderJourney();drawMap();notice('手动起点已标记；它不会随你移动。');return}const room=d.target.closest('[data-map-room]'),issue=d.target.closest('[data-map-issue]');if(room)selectRoom(room.dataset.mapRoom);if(issue)reviews(issue.dataset.mapIssue)});
 svg.addEventListener('pointercancel',()=>drag=null);
 svg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const r=e.target.closest('[data-map-room]'),i=e.target.closest('[data-map-issue]');if(r||i)e.preventDefault();if(r)selectRoom(r.dataset.mapRoom);if(i)reviews(i.dataset.mapIssue)}});
 svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.12:.88,tilted?null:svgPoint(e))},{passive:false});
 $('#source-top').onclick=()=>source(currentFloor().page);$('#room-source').onclick=()=>source(selected.page);$('#data-info').onclick=info;
 document.querySelectorAll('[data-open-review]').forEach(b=>b.onclick=()=>reviews());
 $('#close-modal').onclick=()=>$('#modal').close();$('#modal').addEventListener('close',flushNotes);
 $('#modal-body').onclick=e=>{const p=e.target.closest('[data-photo]'),s=e.target.closest('[data-save-note]'),l=e.target.closest('[data-locate-issue]'),f=e.target.closest('[data-overview-floor]');if(p){flushNotes();source(+p.dataset.photo)}if(s)saveNote(s.dataset.saveNote);if(l){flushNotes();const i=data.issues.find(i=>i.id===l.dataset.locateIssue);$('#modal').close();setFloor(i.floor);modelMode=false;updateMode();view={x:i.x-180,y:i.y-160,w:360,h:320};applyView()}if(f){$('#modal').close();setFloor(f.dataset.overviewFloor)}};
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA/.test(e.target.tagName)&&!$('#modal').open){e.preventDefault();$('#room-search').focus()}if(e.key==='Escape'&&picking){picking=false;updateMode()}});
 $('#coverage-summary').textContent=`6 层 · 28 张照片 · ${rooms.length} 个房间位置已录入`;
 if(selected)floorId=selected.floor;setFloor(floorId,true);
 if(params.get('q')){$('#room-search').value=params.get('q');renderList();const r=rooms.find(r=>normalize(r.id)===normalize(params.get('q')));if(r)selectRoom(r.id,true)}
})();
