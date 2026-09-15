import {parseCSV,analyze,sampleLine} from './analysis.mjs';
const $=id=>document.getElementById(id),photo=$('photo'),ctx=photo.getContext('2d');
let manual=null,picking=null;
function widths(){const value=id=>$(id).value===''?NaN:Number($(id).value);return {left:{minus:value('widthLeftMinus'),plus:value('widthLeftPlus')},right:{minus:value('widthRightMinus'),plus:value('widthRightPlus')}};}
const widthLabel=w=>`−${w.minus} / ＋${w.plus} px`;
const hosted=Boolean(document.querySelector('meta[name=ring-hosted]'));
let img=null,pixels=null,a={x:1150,y:2180},b={x:1900,y:2180},profile=null,result=null,name='',sourceMode='image',center={x:1512,y:2016},zoom=3.5,view={},drag=null,loading=0;
const fmt=v=>v==null||!Number.isFinite(v)?'—':v.toFixed(2);
const error=e=>{$('error').hidden=!e;$('error').textContent=e?.message||e||'';};
function resetEdges(){manual=null;picking=null;$('edgeMode').value='auto';$('manualControls').hidden=true;$('pickHint').textContent='';}
function coordinates(){for(const [id,val] of Object.entries({ax:a.x,ay:a.y,bx:b.x,by:b.y}))$(id).value=Math.round(val);}
function drawPhoto(){const box=photo.getBoundingClientRect(),dpr=window.devicePixelRatio||1;photo.width=Math.round(box.width*dpr);photo.height=Math.round(box.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,box.width,box.height);if(!img){ctx.fillStyle='#516982';ctx.font='16px sans-serif';ctx.textAlign='center';ctx.fillText(sourceMode==='csv'?'CSVの測定線の位置は未確認です':'写真またはCSVを選択してください',box.width/2,box.height/2);return;}
 const s=Math.min(box.width/img.width,box.height/img.height)*zoom,ox=box.width/2-center.x*s,oy=box.height/2-center.y*s;view={s,ox,oy};ctx.drawImage(img,ox,oy,img.width*s,img.height*s);
 if(sourceMode==='csv'){ctx.fillStyle='#11233edb';ctx.fillRect(0,0,box.width,box.height);ctx.fillStyle='white';ctx.font='16px sans-serif';ctx.textAlign='center';ctx.fillText('CSVの測定線の位置は未確認です',box.width/2,box.height/2);return;}
 const screen=p=>({x:ox+p.x*s,y:oy+p.y*s}),A=screen(a),B=screen(b);
 ctx.strokeStyle='#142c49';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.stroke();
 if(result){const len=Math.hypot(b.x-a.x,b.y-a.y);for(const [r,color] of [[result.L,'#4093ff'],[result.R,'#fda658'],[result.C,'#20d3b9']]){const p0=screen({x:a.x+(b.x-a.x)*Math.max(0,r.lo)/len,y:a.y+(b.y-a.y)*Math.max(0,r.lo)/len}),p1=screen({x:a.x+(b.x-a.x)*Math.min(len,r.hi)/len,y:a.y+(b.y-a.y)*Math.min(len,r.hi)/len});ctx.lineWidth=9;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke();}}
 for(const [p,label] of [[A,'A'],[B,'B']]){ctx.fillStyle='#fff';ctx.strokeStyle='#1760cc';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#11233e';ctx.fillRect(p.x-11,p.y-33,22,20);ctx.fillStyle='white';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(label,p.x,p.y-18);}
}
function chart(){const {x,y}=profile,r=result,W=1100,H=280,p={l:58,r:24,t:20,b:44},xmin=x[0],xmax=x.at(-1),ymin=Math.max(0,Math.floor(Math.min(...y)/20)*20-20),ymax=Math.ceil(Math.max(...y)/20)*20+20;
 const X=v=>p.l+(v-xmin)/(xmax-xmin)*(W-p.l-p.r),Y=v=>H-p.b-(v-ymin)/(ymax-ymin)*(H-p.t-p.b);
 let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="輝度プロファイルと両側の平均範囲"><rect width="1100" height="280" fill="white"/>`;
 for(const [region,color] of [[r.L,'#1760cc'],[r.R,'#d97424'],[r.C,'#008c8c']]){const lo=Math.max(xmin,region.lo),hi=Math.min(xmax,region.hi);s+=`<rect x="${X(lo)}" y="${p.t}" width="${X(hi)-X(lo)}" height="${H-p.t-p.b}" fill="${color}" opacity=".1"/><line x1="${X(lo)}" y1="${Y(region.mean)}" x2="${X(hi)}" y2="${Y(region.mean)}" stroke="${color}" stroke-width="3"/>`;}
 for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4;s+=`<line x1="${p.l}" y1="${Y(v)}" x2="${W-p.r}" y2="${Y(v)}" stroke="#e8edf4"/><text x="${p.l-12}" y="${Y(v)+4}" text-anchor="end" fill="#64748b" font-size="12">${v.toFixed(0)}</text>`;}
 for(let i=0;i<=5;i++){const v=xmin+(xmax-xmin)*i/5;s+=`<text x="${X(v)}" y="${H-23}" text-anchor="middle" fill="#64748b" font-size="12">${v.toFixed(0)}</text>`;}
 s+=`<path d="${x.map((v,i)=>(i?'L':'M')+X(v).toFixed(2)+','+Y(y[i]).toFixed(2)).join(' ')}" fill="none" stroke="#30445e" stroke-width="1.5"/>`;
 for(const [id,col] of [[r.left,'#1760cc'],[r.right,'#d97424']])s+=`<circle cx="${X(x[id])}" cy="${Y(y[id])}" r="4.5" fill="${col}" stroke="white" stroke-width="1.5"/>`;
 s+=`<text x="${W/2}" y="${H-3}" text-anchor="middle" fill="#64748b" font-size="12">始点からの距離（px）</text><text transform="translate(15,140) rotate(-90)" text-anchor="middle" fill="#64748b" font-size="12">輝度</text></svg>`;$('chart').innerHTML=s;
 $('chartNote').textContent=`${r.method==='manual'?'手動指定位置':'最小点'}：始点側 ${x[r.left]} px / 終点側 ${x[r.right]} px　｜　平均点数：${r.L.n} / ${r.R.n} / 中央 ${r.C.n} 点　｜　${sourceMode==='csv'?'CSVの輝度値を使用':'写真から読み取り（'+($('gray').value==='mean'?'RGB単純平均':'RGB加重平均')+'）'}`;
}
function render(){ $('legendLeft').textContent=`始点側 ${widthLabel(result.widths.left)}`;$('legendRight').textContent=`終点側 ${widthLabel(result.widths.right)}`;$('windowCaption').textContent=`始点側 ${widthLabel(result.widths.left)}（${result.L.n}点） / 終点側 ${widthLabel(result.widths.right)}（${result.R.n}点）を平均します。`; $('edgeMode').disabled=false;$('edgeLeft').value=profile.x[result.left];$('edgeRight').value=profile.x[result.right];$('pickLeft').disabled=sourceMode==='csv';$('pickRight').disabled=sourceMode==='csv';for(const [id,val] of [['k',result.K],['edge',result.edge],['center',result.C.mean],['left',result.L.mean],['right',result.R.mean]])$(id).textContent=fmt(val);
 $('warnings').replaceChildren(...result.warnings.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));$('status').textContent=result.warnings.length?'範囲を確認':'計算済み';$('save').disabled=false;$('profileSave').disabled=false;chart();drawPhoto();}
function recalc(){error(null);try{if(sourceMode==='image')profile=sampleLine(pixels,img.width,img.height,a,b,$('gray').value);result=analyze(profile,manual,widths());render();}catch(e){result=null;$('save').disabled=true;$('profileSave').disabled=true;for(const id of ['k','edge','center','left','right'])$(id).textContent='—';$('status').textContent='線を確認';$('warnings').replaceChildren();$('chart').replaceChildren();$('chartNote').textContent='';drawPhoto();error(e);}}
async function loadImage(url,title,isExample=false){const token=++loading;const next=new Image();next.decoding='async';await new Promise((ok,no)=>{next.onload=ok;next.onerror=()=>no(Error('画像を読み込めません。JPEGまたはPNGをお試しください。'));next.src=url;});if(token!==loading)return;
 if(next.naturalWidth*next.naturalHeight>40000000)throw Error('画像は4000万画素以下にしてください。');const off=document.createElement('canvas');off.width=next.naturalWidth;off.height=next.naturalHeight;const c=off.getContext('2d',{willReadFrequently:true});c.drawImage(next,0,0);pixels=c.getImageData(0,0,off.width,off.height).data;resetEdges();$('edgeMode').disabled=true;img=next;name=title;sourceMode='image';
 a=isExample?{x:1150,y:2180}:{x:Math.round(img.width*.15),y:Math.round(img.height*.5)};b=isExample?{x:1900,y:2180}:{x:Math.round(img.width*.85),y:Math.round(img.height*.5)};center=isExample?{x:1525,y:2180}:{x:img.width/2,y:img.height/2};zoom=isExample?3.5:1;$('zoom').value=zoom;$('source').textContent=name;$('imageMeta').textContent=`${img.width} × ${img.height} px`;$('canvasHint').textContent='ドラッグで線を引く · A/Bを動かして調整';setInputs(false);coordinates();if(isExample)recalc();else{result=null;profile=null;error(null);for(const id of ['k','edge','center','left','right'])$(id).textContent='—';$('save').disabled=true;$('profileSave').disabled=true;$('status').textContent='測定線を指定';$('warnings').replaceChildren();$('chart').replaceChildren();$('chartNote').textContent='1つの滴を横切る線を引いてください。外周の平均範囲が収まるよう両側に余白を取ります。';$('canvasHint').textContent='対象の滴を横切る線をドラッグしてください';drawPhoto();}}
function setInputs(csv){for(const id of ['ax','ay','bx','by','apply','gray','zoom'])$(id).disabled=csv;}
async function loadCSV(text,title){const parsed=parseCSV(text);analyze(parsed);resetEdges();loading++;profile=parsed;sourceMode='csv';name=title;$('source').textContent=title;$('imageMeta').textContent=`${parsed.x.length} 点 / CSV`;$('canvasHint').textContent='写真とCSVの線は別の測定です';setInputs(true);recalc();}
async function example(){try{await loadImage('assets/fridge-0.jpg','冷蔵庫グリセリン0%.JPG',true);}catch(e){error(e);}}
$('sample').onclick=example;
$('reference').onclick=async()=>{try{const r=await fetch('assets/fridge-0.csv');if(!r.ok)throw Error('見本CSVを読み込めません。');await loadCSV(await r.text(),'冷蔵庫0.csv（保存済みプロファイル）');}catch(e){error(e);}};
$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;let url;try{if(/\.csv$/i.test(f.name))await loadCSV(await f.text(),f.name);else{url=URL.createObjectURL(f);await loadImage(url,f.name);}}catch(e){error(e);}finally{if(url)URL.revokeObjectURL(url);e.target.value='';}};
$('apply').onclick=()=>{resetEdges();a={x:Number($('ax').value),y:Number($('ay').value)};b={x:Number($('bx').value),y:Number($('by').value)};if(['ax','ay','bx','by'].some(id=>$(id).value==='')){error('座標を入力してください。');return;}center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};recalc();};
$('gray').onchange=recalc;$('zoom').oninput=e=>{zoom=+e.target.value;center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};drawPhoto();};
const point=e=>{const r=photo.getBoundingClientRect();return {x:Math.max(0,Math.min(img.width-1,Math.round((e.clientX-r.left-view.ox)/view.s))),y:Math.max(0,Math.min(img.height-1,Math.round((e.clientY-r.top-view.oy)/view.s)))};};
photo.onpointerdown=e=>{if(!img||sourceMode!=='image')return;const p=point(e);
 if(picking){const len=Math.hypot(b.x-a.x,b.y-a.y);const distance=Math.max(0,Math.min(profile.x.at(-1),Math.round(((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/len)));$(picking==='left'?'edgeLeft':'edgeRight').value=distance;picking=null;$('pickHint').textContent='';applyEdges();return;}
 resetEdges();drag=Math.hypot(p.x-a.x,p.y-a.y)*view.s<18?'a':Math.hypot(p.x-b.x,p.y-b.y)*view.s<18?'b':'new';if(drag==='new'){a=p;b={...p};result=null;}photo.setPointerCapture(e.pointerId);drawPhoto();};
photo.onpointermove=e=>{if(!drag)return;const p=point(e);if(drag==='a')a=p;else b=p;result=null;coordinates();drawPhoto();};
photo.onpointerup=e=>{if(!drag)return;drag=null;coordinates();recalc();};photo.onpointercancel=()=>{drag=null;recalc();};
const esc=v=>'"'+String(v).replaceAll('"','""')+'"';
function download(text,filename){
 if(hosted){
  const url=URL.createObjectURL(new Blob(['\ufeff',text],{type:'text/csv;charset=utf-8'}));
  const dialog=document.createElement('dialog');dialog.className='exportDialog';
  const title=document.createElement('h2');title.textContent='CSVを保存';
  const note=document.createElement('p');note.textContent='ダウンロード、またはコピーして表計算ソフトに貼り付けてください。';
  const area=document.createElement('textarea');area.value=text;area.readOnly=true;area.setAttribute('aria-label','CSVの内容');
  const link=document.createElement('a');link.href=url;link.download=filename;link.textContent='CSVをダウンロード';link.className='primary';link.target='downloadFrame';
  let frame=document.getElementById('downloadFrame');if(!frame){frame=document.createElement('iframe');frame.id='downloadFrame';frame.name='downloadFrame';frame.hidden=true;document.body.append(frame);}
  const copy=document.createElement('button');copy.textContent='CSVをコピー';copy.onclick=async()=>{try{await navigator.clipboard.writeText(text);copy.textContent='コピーしました';}catch{area.focus();area.select();note.textContent='CSVを選択しました。コピーのショートカットを押してください。';}};
  const close=document.createElement('button');close.textContent='閉じる';close.onclick=()=>dialog.close();
  const actions=document.createElement('div');actions.className='exportActions';actions.append(link,copy,close);dialog.append(title,note,area,actions);dialog.onclose=()=>{URL.revokeObjectURL(url);dialog.remove();};document.body.append(dialog);dialog.showModal();return;
 }

 let frame=document.getElementById('downloadFrame');if(!frame){frame=document.createElement('iframe');frame.id='downloadFrame';frame.name='downloadFrame';frame.hidden=true;document.body.append(frame);}
 const form=document.createElement('form');form.method='POST';form.action='/download';form.target='downloadFrame';form.hidden=true;
 for(const [name,value] of Object.entries({content:text,filename})){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.append(input);}document.body.append(form);form.submit();form.remove();
}
function resultRecord(){return {Source:name,Mode:sourceMode,Edge_method:result.method,Left_minus_px:result.widths.left.minus,Left_plus_px:result.widths.left.plus,Right_minus_px:result.widths.right.minus,Right_plus_px:result.widths.right.plus,Left_window_start:result.L.lo,Left_window_end:result.L.hi,Right_window_start:result.R.lo,Right_window_end:result.R.hi,Gray:sourceMode==='csv'?'Source CSV':$('gray').value,A_x:sourceMode==='image'?a.x:'',A_y:sourceMode==='image'?a.y:'',B_x:sourceMode==='image'?b.x:'',B_y:sourceMode==='image'?b.y:'',Left_point_x:profile.x[result.left],Left_point_value:profile.y[result.left],Right_point_x:profile.x[result.right],Right_point_value:profile.y[result.right],I_left:result.L.mean,I_right:result.R.mean,I_edge:result.edge,I_center:result.C.mean,N_left:result.L.n,N_right:result.R.n,N_center:result.C.n,K_percent:result.K??'',Status:result.warnings.join(' / ')||'OK'};}
$('save').onclick=()=>{if(!result)return;const r=resultRecord();download(Object.keys(r).join(',')+'\n'+Object.values(r).map(esc).join(',')+'\n',name.replace(/\.[^.]+$/,'')+'_解析結果.csv');};
$('profileSave').onclick=()=>{if(!result)return;download('Distance_(pixels),Gray_Value\n'+profile.x.map((v,i)=>v+','+profile.y[i].toFixed(8)).join('\n'),'輝度プロファイル.csv');};
function applyEdges(){if(!profile)return;try{if($('edgeLeft').value===''||$('edgeRight').value==='')throw Error('左右の外周位置を入力してください。');const candidate={left:Number($('edgeLeft').value),right:Number($('edgeRight').value)};analyze(profile,candidate,widths());manual=candidate;recalc();}catch(e){error(e);}}
$('edgeMode').disabled=true;
$('edgeMode').onchange=()=>{if(!profile||!result)return;picking=null;$('pickHint').textContent='';const use=$('edgeMode').value==='manual';$('manualControls').hidden=!use;manual=use?{left:profile.x[result.left],right:profile.x[result.right]}:null;recalc();};
$('edgeApply').onclick=applyEdges;
for(const id of ['widthLeftMinus','widthLeftPlus','widthRightMinus','widthRightPlus'])$(id).oninput=()=>{if(profile)recalc();};
for(const side of ['Left','Right'])$('pick'+side).onclick=()=>{picking=side.toLowerCase();$('pickHint').textContent=(side==='Left'?'始点側':'終点側')+'の外周を写真上でクリックしてください（測定線上に投影します）。';};
new ResizeObserver(drawPhoto).observe(photo.parentElement);
// Optional browser-native tools use the same actions and state as the interface.
if(document.modelContext?.registerTool){for(const tool of [{name:'read_ring_measurement',description:'Read the current ring-analysis result.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({result:result?resultRecord():null})},{name:'set_measurement_line',description:'Set both endpoints on the loaded image and recalculate the visible result.',inputSchema:{type:'object',properties:{ax:{type:'number'},ay:{type:'number'},bx:{type:'number'},by:{type:'number'}},required:['ax','ay','bx','by'],additionalProperties:false},execute:input=>{if(sourceMode!=='image'||!img)throw Error('Load an image first.');const aa={x:input.ax,y:input.ay},bb={x:input.bx,y:input.by};sampleLine(pixels,img.width,img.height,aa,bb,$('gray').value);resetEdges();a=aa;b=bb;center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};coordinates();recalc();return resultRecord();}}]){try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}}}
if(hosted){$('sample').hidden=true;$('reference').hidden=true;$('source').textContent='ファイル未選択';$('imageMeta').textContent='';$('canvasHint').textContent='写真の読み込み後、ドラッグで線を指定';$('status').textContent='ファイルを選択';setInputs(true);drawPhoto();}else await example();
