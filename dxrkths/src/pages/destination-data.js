/** One palette shared by native pages, physical cards and portal lighting. */
export const DESTINATION_THEMES=Object.freeze([
 {key:'berserk',color:'#ff2348',rgb:'255 35 72',label:'Berserk Drift X'},
 {key:'groups',color:'#eef4ff',rgb:'238 244 255',label:'Groups & Games'},
 {key:'projects',color:'#a66bff',rgb:'166 107 255',label:'Future Projects'},
 {key:'about',color:'#ff913d',rgb:'255 145 61',label:'About DXT'},
 {key:'contact',color:'#79d8ff',rgb:'121 216 255',label:'Socials & Contact'},
].map(Object.freeze));
export const DXT_BIO=Object.freeze([
 'Olá, sou DXT, moro no Brasil, tenho 22 anos e sou o único desenvolvedor por trás de toda a franquia BERSERK DRIFT (1, 2 e X).',
 'Esse é meu espaço pessoal para compartilhar o que estou criando no momento e as ideias que estou explorando. Atualmente, meus projetos principais vivem na plataforma Roblox, mas estou me arriscando a desenvolver jogos fora dela, tanto para evoluir quanto para trazer algo realmente interessante para quem acredita no meu trabalho.',
 'O que vem a seguir é um mistério, mas espere sempre por coisas novas!',
]);
export const FUTURE_PROJECTS=Object.freeze([
 {category:'Games',subtitle:'New roads to explore',items:[['BERSERK DRIFT: RALLY','Roblox'],['Unnamed Drift Game','Steam'],['Right Cut!','Roblox']]},
 {category:'Addons',subtitle:'Tools for the creative process',items:[['Procedural Tiremark Generator','Blender'],['Procedural Vegetation Placer','Blender']]},
 {category:'Systems',subtitle:'The mechanics behind the experience',items:[['Drift Judge Score System','Roblox'],['FFB System','Roblox']]},
].map(group=>Object.freeze({...group,items:Object.freeze(group.items.map(Object.freeze))})));
// Only confirmed group membership is published. Empty lists are intentional;
// add the remaining real images here once the owner supplies the catalogue.
export const GROUP_GAMES=Object.freeze({
 revline:Object.freeze([{name:'Berserk Drift X',image:'/assets/images/berserk/game-1.webp',alt:'Berserk Drift X, official project image'}].map(Object.freeze)),
 frost:Object.freeze([]),
});
