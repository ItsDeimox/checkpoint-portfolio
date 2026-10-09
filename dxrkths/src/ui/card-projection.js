/** Column-major matrix shared by native HTML and the GPU. CSS y points downward. */
const rad=d=>d*Math.PI/180;
export function cardMatrix(hover=0,mobile=false){
 const h=Math.max(0,Math.min(1,hover)),rx=rad((mobile?-23:-38)+h*13),ry=rad((mobile?9:20)-h*9),rz=rad(-2.7+h*1.6);
 const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
 const d=mobile?950:1100,z=h*(mobile?18:32),y=-h*3;
 // Rz * Ry * Rx. Nonzero last-row values provide actual projective foreshortening.
 const m=[cz*cy,sz*cy,-sy,0,cz*sy*sx-sz*cx,sz*sy*sx+cz*cx,cy*sx,0,cz*sy*cx+sz*sx,sz*sy*cx-cz*sx,cy*cx,0,0,y,z,1];
 for(let c=0;c<4;c++)m[c*4+3]=(c===3?1:0)-m[c*4+2]/d;
 return m;
}
export function projectCard(m,x,y,z=0){const w=m[3]*x+m[7]*y+m[11]*z+m[15];return[(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,w];}
export function unprojectCard(m,x,y){
 const a=m[0]-x*m[3],b=m[4]-x*m[7],c=x*m[15]-m[12],d=m[1]-y*m[3],e=m[5]-y*m[7],f=y*m[15]-m[13],det=a*e-b*d;
 if(Math.abs(det)<1e-12)return[0,0];return[(c*e-b*f)/det,(a*f-c*d)/det];
}
export function materialImpulse(speed){return Number.isFinite(speed)&&speed>8?Math.min(1.4,Math.pow(speed/1200,1.35)):0;}

/** Smooth shared focus weight: no Boolean threshold changes on neighboring cards. */
export function backgroundTreatment(hover,dominant){const difference=Math.max(0,Math.min(1,dominant-hover));return [1-difference*.14,difference*1.65];}
