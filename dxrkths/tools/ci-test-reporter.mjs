/** Compact CI output without changing Node's test execution or exit status. */
export default async function* report(source){
 const failures=[];
 for await(const {type,data} of source){
  if(type==='test:fail'){
   const error=data.details?.error;
   failures.push({name:data.name,file:data.file,line:data.line,message:String(error?.cause?.message??error?.message??error).slice(0,420),stack:String(error?.cause?.stack??error?.stack??'').split('\n').filter(line=>/^\s+at /.test(line)).slice(0,4)});
  }
  if(type==='test:diagnostic'&&data.nesting===0)yield `# ${data.message}\n`;
  if(type==='test:stderr')yield data.message;
 }
 for(const failure of failures)yield `FAIL ${JSON.stringify(failure)}\n`;
}
