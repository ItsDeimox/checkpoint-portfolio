/** The golden-angle aperture is fixed. Keep its trigonometry out of every
 * fragment/sample; division by the chosen sample count remains outside the loop. */
export function createApertureBasis(){
  const basis=new Float32Array(64);
  for(let i=0;i<32;i++){
    const angle=Math.fround(i*Math.fround(2.39996323)),radius=Math.sqrt(i+.5);
    basis[i*2]=Math.cos(angle)*radius;
    basis[i*2+1]=Math.sin(angle)*radius;
  }
  return basis;
}
