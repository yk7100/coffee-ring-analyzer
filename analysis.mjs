export function parseCSV(text) {
 const rows=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(r=>r.split(',').map(s=>s.trim()));
 if(rows[0]?.join(',')!=='Distance_(pixels),Gray_Value')throw Error('CSVの列名は Distance_(pixels),Gray_Value にしてください。');
 const x=[],y=[];for(const [i,r] of rows.slice(1).entries()){if(r.length!==2||r.some(v=>v==='')||r.some(v=>!Number.isFinite(Number(v))))throw Error(`${i+2}行目を読み込めません。`);x.push(+r[0]);y.push(+r[1]);}return {x,y};
}
export function analyze({x,y}) {
 if(x.length<3||x.length!==y.length||[...x,...y].some(v=>!Number.isFinite(v)))throw Error('有効なプロファイルが必要です。');
 for(let i=1;i<x.length;i++)if(Math.abs(x[i]-x[i-1]-1)>1e-4)throw Error('距離は1 px刻みで入力してください。');
 const length=x.at(-1)-x[0],t=x.map(v=>(v-x[0])/length);
 const min=(lo,hi)=>{let id=-1;for(let i=0;i<t.length;i++)if(t[i]>=lo&&t[i]<=hi&&(id<0||y[i]<y[id]))id=i;return id;};
 const left=min(0,1/3),right=min(2/3,1);
 const region=(lo,hi)=>{const ids=x.map((v,i)=>v>=lo-1e-8&&v<=hi+1e-8?i:-1).filter(i=>i>=0);return {mean:ids.reduce((s,i)=>s+y[i],0)/ids.length,n:ids.length,lo,hi,actualLo:x[ids[0]],actualHi:x[ids.at(-1)]};};
 const L=region(x[left]-15,x[left]+15),R=region(x[right]-15,x[right]+15),C=region(x[0]+.4*length,x[0]+.6*length);
 const edge=(L.mean+R.mean)/2,short=L.n!==31||R.n!==31,interior=t[left]>.25||t[right]<.75;
 const warnings=[];if(short)warnings.push('端の±15 pxが測定線に収まりません。部分平均を表示し、Kは計算しません。両端に余白を加えて再測定してください。');
 if(interior)warnings.push('最小点が中央寄りです。外周ではなく内部を拾っている可能性があります。写真で確認してください。');
 if(!(C.mean>0))warnings.push('中央平均が0以下のため、Kは計算できません。');
 return {left,right,L,R,C,edge,K:!short&&C.mean>0?100*(1-edge/C.mean):null,short,interior,warnings,length};
}
export function sampleLine(pixels,width,height,a,b,mode='mean') {
 for(const p of [a,b])if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>width-1||p.y>height-1)throw Error('測定線の両端を画像内に置いてください。');
 const len=Math.hypot(b.x-a.x,b.y-a.y);if(len<60)throw Error('測定線を60 px以上にしてください。');
 const n=Math.floor(len)+1,x=[],y=[];
 const gray=(xx,yy)=>{const k=4*(yy*width+xx);return mode==='mean'?(pixels[k]+pixels[k+1]+pixels[k+2])/3:.299*pixels[k]+.587*pixels[k+1]+.114*pixels[k+2];};
 for(let i=0;i<n;i++){const px=a.x+(b.x-a.x)*i/len,py=a.y+(b.y-a.y)*i/len,xx=Math.floor(px),yy=Math.floor(py),dx=px-xx,dy=py-yy,x2=Math.min(width-1,xx+1),y2=Math.min(height-1,yy+1);x.push(i);y.push((1-dy)*((1-dx)*gray(xx,yy)+dx*gray(x2,yy))+dy*((1-dx)*gray(xx,y2)+dx*gray(x2,y2)));}
 return {x,y};
}
