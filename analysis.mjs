export function parseCSV(text) {
 const rows=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(r=>r.split(',').map(s=>s.trim()));
 if(rows[0]?.join(',')!=='Distance_(pixels),Gray_Value')throw Error('CSVの列名は Distance_(pixels),Gray_Value にしてください。');
 const x=[],y=[];for(const [i,r] of rows.slice(1).entries()){if(r.length!==2||r.some(v=>v==='')||r.some(v=>!Number.isFinite(Number(v))))throw Error(`${i+2}行目を読み込めません。`);x.push(+r[0]);y.push(+r[1]);}return {x,y};
}
export function analyze({x,y}, manual=null, widths={left:15,right:15}) {
 if(x.length<3||x.length!==y.length||[...x,...y].some(v=>!Number.isFinite(v)))throw Error('有効なプロファイルが必要です。');
 for(let i=1;i<x.length;i++)if(Math.abs(x[i]-x[i-1]-1)>1e-4)throw Error('距離は1 px刻みで入力してください。');
 widths=Object.fromEntries(['left','right'].map(side=>[side,typeof widths[side]==='number'?{minus:widths[side],plus:widths[side]}:{...widths[side]}]));
 if(![widths.left.minus,widths.left.plus,widths.right.minus,widths.right.plus].every(v=>Number.isInteger(v)&&v>=0&&v<=10000))throw Error('平均範囲は0〜10000 pxの整数にしてください。');
 const length=x.at(-1)-x[0],t=x.map(v=>(v-x[0])/length);
 const min=(lo,hi)=>{let id=-1;for(let i=0;i<t.length;i++)if(t[i]>=lo&&t[i]<=hi&&(id<0||y[i]<y[id]))id=i;return id;};
 let left=min(0,1/3),right=min(2/3,1);
 if(manual){
  if(!Number.isFinite(manual.left)||!Number.isFinite(manual.right)||manual.left<x[0]||manual.right>x.at(-1)||manual.left>=manual.right)throw Error('外周位置は測定線内で、始点側 < 終点側になるよう指定してください。');
  const nearest=v=>Math.max(0,Math.min(x.length-1,Math.round(v-x[0])));
  left=nearest(manual.left);right=nearest(manual.right);
  if(left>=right)throw Error('左右に異なる外周位置を指定してください。');
 }
 const region=(lo,hi)=>{const ids=x.map((v,i)=>v>=lo-1e-8&&v<=hi+1e-8?i:-1).filter(i=>i>=0);return {mean:ids.reduce((s,i)=>s+y[i],0)/ids.length,n:ids.length,lo,hi,actualLo:x[ids[0]],actualHi:x[ids.at(-1)]};};
 const L=region(x[left]-widths.left.minus,x[left]+widths.left.plus),R=region(x[right]-widths.right.minus,x[right]+widths.right.plus),C=region(x[0]+.4*length,x[0]+.6*length);
 const edge=(L.mean+R.mean)/2,short=L.n!==widths.left.minus+widths.left.plus+1||R.n!==widths.right.minus+widths.right.plus+1,interior=!manual&&(t[left]>.25||t[right]<.75);
 const warnings=[];if(short)warnings.push('指定した平均範囲が測定線に収まりません。部分平均を表示し、Kは計算しません。両端に余白を加えて再測定してください。');
 if(interior)warnings.push('最小点が中央寄りです。外周ではなく内部を拾っている可能性があります。写真で確認してください。');
 if(!(C.mean>0))warnings.push('中央平均が0以下のため、Kは計算できません。');
 return {widths:{...widths},method:manual?'manual':'auto',left,right,L,R,C,edge,K:!short&&C.mean>0?100*(1-edge/C.mean):null,short,interior,warnings,length};
}
// Fiji/ImageJ 1.54p: RGB or converted 8-bit, straight line width 1,
// uncalibrated pixels. Reference: ImageProcessor.getLine/getInterpolatedValue,
// ColorProcessor.getPixelValue and TypeConverter.convertRGBToByte.
export function sampleLine(pixels,width,height,a,b,mode='mean',interpolate=true) {
 for(const p of [a,b])if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>width-1||p.y>height-1)throw Error('測定線の両端を画像内に置いてください。');
 if(!['mean','weighted','mean8','weighted8'].includes(mode))throw Error('輝度の計算方法を選択してください。');
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.sqrt(dx*dx+dy*dy);
 if(len<60)throw Error('測定線を60 px以上にしてください。');
 const n=Math.round(len),x=[],y=[],weighted=mode.startsWith('weighted'),byte=mode.endsWith('8');
 const weights=weighted?[.299,.587,.114]:[1/3,1/3,1/3];
 const gray=(xx,yy)=>{if(xx<0||yy<0||xx>=width||yy>=height)return NaN;const k=4*(yy*width+xx),v=pixels[k]*weights[0]+pixels[k+1]*weights[1]+pixels[k+2]*weights[2];return byte?Math.floor(v+.5):Math.fround(v);};
 const edge=(xx,yy)=>gray(Math.max(0,Math.min(width-1,xx)),Math.max(0,Math.min(height-1,yy)));
 const sample=(xx,yy)=>{
  if(!interpolate)return gray(Math.round(xx),Math.round(yy));
  if(xx<-1||xx>=width||yy<-1||yy>=height)return 0;
  const ix=Math.trunc(xx),iy=Math.trunc(yy),fx=Math.max(0,xx-ix),fy=Math.max(0,yy-iy);
  const lower=edge(ix,iy),upper=edge(ix,iy+1);
  const low=lower+fx*(edge(ix+1,iy)-lower),high=upper+fx*(edge(ix+1,iy+1)-upper);
  return low+fy*(high-low);
 };
 // Repeated addition mirrors ImageJ, including its subpixel rounding behavior.
 let rx=a.x,ry=a.y;for(let i=0;i<=n;i++){x.push(i);y.push(sample(rx,ry));rx+=dx/n;ry+=dy/n;}
 return {x,y,engine:'ImageJ 1.54p',mode,interpolate,lineWidth:1,geometricLength:len};
}
