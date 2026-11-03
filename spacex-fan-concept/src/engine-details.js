/** Independent licensed engine views. These are external assemblies, not invented turbopump cutaways. */
const creator='MartianDays',base='https://sketchfab.com/3d-models/';
export const engineDetails={
 merlin:{family:'merlin',title:'MERLIN 1D',kicker:'SOURCE-AUTHORED ENGINE MODEL.',description:'Inspect the complete geometry supplied in this separate Merlin 1D artist model, including its upper hardware and nozzle. This is an exterior reference, not a manufacturer-certified internal cutaway.',specs:[['VARIANT','SEA LEVEL'],['SOURCE','MARTIANDAYS'],['VIEW','INDIVIDUAL ENGINE']],author:creator,url:base+'merlin-1d-088a207cae57488f876bbc16daf2148d'},
 merlinvac:{family:'merlinvac',title:'MERLIN VACUUM',kicker:'SOURCE-AUTHORED ENGINE MODEL.',description:'A separate, preauthored vacuum-engine model exposes the upper assembly as well as the large nozzle. The creator describes it as a minimalist interpretation; hidden turbine and combustion internals are not supplied.',specs:[['VARIANT','VACUUM'],['SOURCE','MARTIANDAYS'],['VIEW','INDIVIDUAL ENGINE']],author:creator,url:base+'merlin-1d-vacuum-f20ebb6e857b405cbdc66568d48d2fcb'}
};
export function engineFor(vehicleId,part){
 if(part==='engines'&&['falcon-9','falcon-heavy'].includes(vehicleId))return engineDetails.merlin;
 if(vehicleId==='falcon-9'&&part==='interstage')return engineDetails.merlinvac;
 return null;
}
