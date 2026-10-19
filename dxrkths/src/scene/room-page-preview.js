import {toSvg,getFontEmbedCSS} from 'html-to-image';

let fonts;
/** Capture only the visible viewport under the loading cover. The portal can
 * then composite one bitmap instead of rerasterizing an entire scaled page. */
export async function capturePagePreview(stage,signal,{height=stage.clientHeight,scroll=0}={}){
 signal?.throwIfAborted();
 const width=stage.clientWidth;
 if(!(width>0&&height>0))return null;
 fonts??=getFontEmbedCSS(stage).catch(error=>{fonts=null;throw error;});
 const fontEmbedCSS=await fonts;
 signal?.throwIfAborted();
 // Chromium can report zero used auto margins after a nested WebGL surface
 // detaches. Preserve the measured centering in the SVG clone, then restore
 // responsive CSS before these same nodes become the interactive page.
 const layout=stage.querySelector('.section-layout'),saved=layout?.style.cssText;
 if(layout){
  const box=layout.getBoundingClientRect(),parent=stage.getBoundingClientRect(),style=getComputedStyle(stage);
  layout.style.marginInlineStart=`${box.left-parent.left-parseFloat(style.paddingLeft)-stage.clientLeft}px`;
  layout.style.marginInlineEnd=`${parent.right-box.right-parseFloat(style.paddingRight)-stage.clientLeft}px`;
 }
 // Scroll offsets and fixed viewport coordinates are browser state, not DOM
 // attributes. Apply them to the serialized clone without moving the live page.
 const states=[];
 for(const node of stage.querySelectorAll('*')){
  const fixed=getComputedStyle(node).position==='fixed';
  if(!fixed&&!node.scrollLeft&&!node.scrollTop)continue;
  const key=String(states.length),previous=node.getAttribute('data-dxt-capture');
  states.push({node,key,previous,left:node.scrollLeft,top:node.scrollTop,box:fixed?node.getBoundingClientRect():null});
  node.setAttribute('data-dxt-capture',key);
 }
 let svgURL;
 try{svgURL=await toSvg(stage,{width,height,fontEmbedCSS,
   style:{opacity:'1',height:`${stage.clientHeight}px`,transform:scroll?`translateY(${-scroll}px)`:'none',transformOrigin:'0 0',animation:'none',position:'relative',inset:'auto',margin:'0'},
  });
 }finally{
  if(layout)layout.style.cssText=saved;
  for(const s of states)if(s.previous===null)s.node.removeAttribute('data-dxt-capture');else s.node.setAttribute('data-dxt-capture',s.previous);
 }
 signal?.throwIfAborted();
 if(states.length){
  const xml=new DOMParser().parseFromString(decodeURIComponent(svgURL.slice(svgURL.indexOf(',')+1)),'image/svg+xml');
  for(const s of states){
   const clone=xml.querySelector(`[data-dxt-capture="${s.key}"]`);if(!clone)continue;
   if(s.box)Object.assign(clone.style,{position:'absolute',top:`${s.box.top+scroll}px`,left:`${s.box.left}px`,bottom:'auto',right:'auto',width:`${s.box.width}px`,height:`${s.box.height}px`,margin:'0',transform:'none',boxSizing:'border-box'});
   if(s.left||s.top)for(const child of clone.children){
    const transform=child.style.transform;
    child.style.transform=`translate(${-s.left}px,${-s.top}px) ${transform&&transform!=='none'?transform:''}`;
   }
   clone.removeAttribute('data-dxt-capture');
  }
  svgURL=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(xml.documentElement))}`;
 }
 const image=new Image();image.src=svgURL;await image.decode();signal?.throwIfAborted();
 const canvas=document.createElement('canvas'),ratio=Math.min(1,Math.sqrt(3686400/(width*height)));
 canvas.width=Math.floor(width*ratio);canvas.height=Math.floor(height*ratio);
 canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
 if(signal?.aborted){canvas.width=canvas.height=0;signal.throwIfAborted();}
 canvas.className='portal-page-preview';canvas.setAttribute('aria-hidden','true');
 return canvas;
}
