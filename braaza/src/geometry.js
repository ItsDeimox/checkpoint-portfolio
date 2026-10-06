import {random} from './core.js';
const data=()=>({positions:[],normals:[],uvs:[],indices:[]});
function tri(d,a,b,c){const x=b.map((v,i)=>v-a[i]),y=c.map((v,i)=>v-a[i]),n=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],l=Math.hypot(...n),i=d.positions.length/3;d.positions.push(...a,...b,...c);d.normals.push(...n.map(v=>v/l),...n.map(v=>v/l),...n.map(v=>v/l));d.uvs.push(0,0,1,0,.5,1);d.indices.push(i,i+1,i+2);}
export function rock(seed=3){const d=data(),r=random(seed),t=(1+Math.sqrt(5))/2;let v=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(p=>p.map(x=>x/Math.hypot(...p)));
 const faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]],cache=new Map();
 const point=p=>{const key=p.map(v=>v.toFixed(5)).join(',');if(cache.has(key))return cache.get(key);const l=Math.hypot(...p),f=.82+r()*.27,q=p.map(x=>x/l*f);cache.set(key,q);return q;};
 for(const f of faces){const [a,b,c]=f.map(i=>v[i]),ab=a.map((x,i)=>(x+b[i])*.5),bc=b.map((x,i)=>(x+c[i])*.5),ca=c.map((x,i)=>(x+a[i])*.5);for(const [p,q,s] of [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]])tri(d,point(p),point(q),point(s));}return d;
}
export function panel(w=4.8,h=2.25){return {positions:[-w/2,-h/2,0,w/2,-h/2,0,w/2,h/2,0,-w/2,h/2,0],normals:[0,0,1,0,0,1,0,0,1,0,0,1],uvs:[0,0,1,0,1,1,0,1],indices:[0,1,2,0,2,3]};}
export function tube(kind='chain',radius=1){const d=data(),segments=kind==='chain'?64:96,sides=10;
 for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;let x,y,tx,ty,r;
  if(kind==='chain'){x=Math.cos(a)*.29;y=Math.sin(a)*.64;const nn=Math.hypot(Math.cos(a)*.64,Math.sin(a)*.29);tx=Math.cos(a)*.64/nn;ty=Math.sin(a)*.29/nn;r=.115;}
  else{x=Math.cos(a)*radius;y=Math.sin(a)*radius;tx=Math.cos(a);ty=Math.sin(a);r=.025;}
  for(let j=0;j<=sides;j++){const b=j/sides*Math.PI*2,n=[tx*Math.cos(b),ty*Math.cos(b),Math.sin(b)];d.positions.push(x+n[0]*r,y+n[1]*r,n[2]*r);d.normals.push(...n);d.uvs.push(i/segments,j/sides);}
 }
 for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;d.indices.push(a,b,a+1,b,b+1,a+1);}return d;
}
export function cube(){const d=data(),v=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];for(const [a,b,c,e] of [[4,5,6,7],[1,0,3,2],[0,4,7,3],[5,1,2,6],[3,7,6,2],[0,1,5,4]]){tri(d,v[a],v[b],v[c]);tri(d,v[a],v[c],v[e]);}return d;}
