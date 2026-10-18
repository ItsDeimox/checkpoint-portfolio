import {BufferGeometry,Float32BufferAttribute,MathUtils} from 'three';
const smooth=(a,b,x)=>{const t=MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
/** A draped cloth surface over a coupe silhouette. Geometry is built once.
 * Hood, roof, shoulders and grounded hem stay independent of the showroom car. */
export function createCoveredCarGeometry(columns=72,rows=112){
 const positions=[],uvs=[],indices=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const u=i/columns,v=j/rows,x=(u-.5)*3.12,z=(v-.5)*6.06;
  const end=1-smooth(2.15,3.03,Math.abs(z));
  const width=.96+.12*Math.exp(-Math.pow((z+.65)/1.75,2));
  const across=1-smooth(width*.64,1.56,Math.abs(x));
  const roof=.79*Math.exp(-Math.pow((z+.32)/1.06,6))*(1-smooth(.65,1.16,Math.abs(x)));
  const body=(.78+.12*Math.exp(-Math.pow((z-1.3)/.9,2)))*across;
  const hem=.035+.012*Math.cos(z*11.4+x*9.3);
  const edge=1-smooth(.05,.93,across);
  const folds=(Math.sin(z*18.8+x*2.5)*.032+Math.sin(z*30.3-x*4.2)*.011)*edge*end;
  const hoodFold=.009*Math.sin(x*14+z*9)*across*end;
  const y=Math.max(.025,hem+(body+roof)*end+folds+hoodFold);
  positions.push(x,y,z);uvs.push(u,v);
  if(i<columns&&j<rows){const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;indices.push(a,c,b,b,c,d);}
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
