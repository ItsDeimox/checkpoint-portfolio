from PIL import Image,ImageChops
import numpy as np, shutil, json, hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]; out=root/'assets/images'
# Real artwork supplied for this project. No concept screenshot is used in the UI.
items={'race':'image(10).png','trophy':'image(9).png','game-icon':'image(20261009-093353).png','frost-card':'image(20261009-093411).png','dxt-card':'image(5).png','pattern-dark':'image(20261009-093659).png','pattern-orange':'image(20261009-093649).png','revline-pattern':'image(20261009-093400).png'}
manifest=[]
for name,file in items.items():
 im=Image.open('/mnt/data/'+file).convert('RGB');im.thumbnail((1800 if name=='race' else 1000,1100));p=out/(name+'.webp');im.save(p,'WEBP',quality=88 if name=='race' else 83,method=6)
 manifest.append({'file':str(p.relative_to(root)),'source':file,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
# Use alpha when supplied; only remove solid monochrome backgrounds from logo assets.
for name,file,whitebg in [('dxt','image(6).png',False),('berserk','image(7).png',False),('revline','image(20261009-093357).png',True),('frost','image(20261009-093405).png',False)]:
 im=Image.open('/mnt/data/'+file).convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(float)
 if a[:,:,3].min()==255:
  if whitebg:
   alpha=255-rgb.min(2);rr=np.clip(255-rgb,0,255);rr[:,:,0]=np.where(rgb[:,:,0]>rgb[:,:,1]*1.7,255,rr[:,:,0]);a[:,:,:3]=rr
  else: alpha=rgb.max(2)
  a[:,:,3]=alpha.astype('uint8')
 im=Image.fromarray(a);bounds=im.getchannel('A').getbbox();im=im.crop(bounds)
 im.thumbnail((1100,650));im.save(root/'assets/icons'/f'{name}.webp','WEBP',lossless=True,method=6)
shutil.copyfile('/mnt/data/DXTlogoPrinted.glb',root/'assets/models/dxt-logo.glb')
(root/'docs/asset-provenance.json').write_text(json.dumps(manifest,indent=2))
# Depth map for the supplied race artwork, used as a shallow 3D relief (not a 360-degree car).
from PIL import ImageDraw, ImageFilter
w,h=Image.open(out/'race.webp').size
im=Image.new('L',(w,h),30);d=ImageDraw.Draw(im)
# Card-wide floor falls away to the horizon.
a=np.asarray(im).copy().astype(float)
for y in range(h):a[y,:]=20+max(0,(y/h-.42))**1.2*110
im=Image.fromarray(a.astype('uint8'));d=ImageDraw.Draw(im)
def poly(points,color):d.polygon([(int(x*w),int(y*h)) for x,y in points],fill=color)
poly([(.205,.593),(.246,.435),(.332,.33),(.51,.326),(.571,.346),(.602,.48),(.61,.68),(.472,.733),(.263,.642)],120)
poly([(.324,.794),(.33,.675),(.377,.586),(.474,.51),(.528,.42),(.576,.397),(.795,.396),(.839,.406),(.913,.49),(.962,.526),(.966,.674),(.882,.81),(.692,.925),(.46,.935),(.366,.866)],220)
im=im.filter(ImageFilter.GaussianBlur(w*.012));im.save(out/'race-depth.webp','WEBP',lossless=True)
print('asset bytes',sum(p.stat().st_size for p in (root/'assets').rglob('*') if p.is_file()))
