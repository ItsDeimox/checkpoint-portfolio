/** Display UV -> scene UV, shared with picking. */
export function undistortUv(uv,{k=-.012,aspect=1}={}){const x=(uv[0]-.5)*2*aspect,y=(uv[1]-.5)*2,r2=x*x+y*y,s=1+k*r2;return [.5+x*s/(2*aspect),.5+y*s/2];}
export function distortUv(uv,lens={}){const out=[...uv];for(let i=0;i<9;i++){const p=undistortUv(out,lens);out[0]+=uv[0]-p[0];out[1]+=uv[1]-p[1];}return out;}
