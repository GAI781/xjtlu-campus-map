'use strict';
const $=s=>document.querySelector(s),canvas=$('#scene'),ctx=canvas.getContext('2d');
const TAU=Math.PI*2,rad=d=>d*Math.PI/180;
// Coordinates describe relative positions in the uploaded campus map, not survey coordinates.
const buildings=[
{id:'A',angle:65,name:'智能制造',full:'智能制造与机器人',en:'MAKE & CREATE',color:'#64acff',soft:'#e4eef0',tags:['智能制造','机器人'],desc:'让想法动起来。在机械与代码之间，探索制造的更多可能。',symbol:'robot'},
{id:'B',angle:2,name:'学者空间',full:'学者空间',en:'THINK & SHARE',color:'#efbd59',soft:'#efeddf',tags:['学者空间','1F—5F','原图可核对'],desc:'学者空间。已按展示牌建立 1–5F 楼层结构草模，保留 AB、BC 连廊编号；门洞与实际通行关系待复核。',symbol:'book'},
{id:'C',angle:-43,name:'创新创业',full:'创业家教学楼',en:'IDEA TO IMPACT',color:'#ff987d',soft:'#f5e9d4',tags:['创新','创业','从 0 到 1'],desc:'每一个新点子，都值得一次尝试。从灵感出发，让创意慢慢成为现实。',symbol:'bulb'},
{id:'D',angle:-87,name:'人工智能',full:'人工智能与大数据',en:'DATA & DISCOVERY',color:'#a885f3',soft:'#ece7f4',tags:['人工智能','大数据'],desc:'从数据里发现规律，用算法连接想象。一起探索智能的边界。',symbol:'network'},
{id:'E',angle:-130,name:'供应链',full:'供应链',en:'CONNECT THE WORLD',color:'#8db79c',soft:'#e3eee2',tags:['供应链','协同','连接'],desc:'从一个包裹到一张全球网络，看见每一次连接背后的协作。',symbol:'box'},
{id:'F',angle:176,name:'楼层地图',full:'室内地图试点',en:'FLOOR ATLAS',color:'#a59cef',soft:'#ebeee2',tags:['BF—5F','原图可核对'],desc:'已录入六层展示牌和房间位置，可搜索房间、查看原图与参与复核。专业定位待补充，通行路线待核验。',symbol:'arch'},
{id:'G',angle:123,name:'艺术与科技',full:'艺术与科技',en:'ART MEETS TECH',color:'#ee91bc',soft:'#f5e5e5',tags:['艺术','科技','BF—5F地图'],desc:'艺术与科技空间。已按展示牌建立 BF—5F 楼层结构草模，可搜索房间、核对原图；门洞及通行关系待复核。',symbol:'art'}];
const iconPaths={robot:'<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 12v2m6-2v2M9 17h6M2 12v4m20-4v4"/><circle cx="12" cy="3" r="1"/>',book:'<path d="M12 6C8 3 5 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14M6 8l3 1m6 0 3-1M6 12l3 1m6 0 3-1"/>',bulb:'<path d="M8 15a7 7 0 1 1 8 0v3H8zM9 21h6M10 11l2 3 2-3m-2 3v4"/>',network:'<circle cx="12" cy="12" r="3"/><circle cx="4" cy="4" r="2"/><circle cx="20" cy="5" r="2"/><circle cx="5" cy="20" r="2"/><circle cx="20" cy="19" r="2"/><path d="m6 6 4 4m4 0 4-4M7 18l3-4m4 0 4 4"/>',box:'<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M7 4l10 6v5"/>',arch:'<path d="M5 21V10a7 7 0 0 1 14 0v11h-5V10a2 2 0 0 0-4 0v11z"/>',art:'<path d="m4 20 5-13 5 13zM10 3h10v10h-6"/><circle cx="18" cy="18" r="4"/>'};
function icon(type){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[type]}</svg>`}

