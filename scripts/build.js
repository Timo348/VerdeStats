const fs = require('node:fs/promises');
const path = require('node:path');
const ejs = require('ejs');
const root = path.resolve(__dirname,'..');
async function build(outputDirectory=path.join(root,'dist')) {
  const resolved=path.resolve(outputDirectory);
  if (resolved!==path.join(root,'dist')) throw new Error('Build output must be project/dist');
  await fs.rm(resolved,{recursive:true,force:true});
  await fs.mkdir(resolved,{recursive:true});
  await fs.cp(path.join(root,'public'),resolved,{recursive:true});
  await fs.mkdir(path.join(resolved,'vendor'),{recursive:true});
  await fs.copyFile(path.join(root,'node_modules/fflate/umd/index.js'),path.join(resolved,'vendor/fflate.js'));
  await fs.copyFile(path.join(root,'node_modules/fflate/LICENSE'),path.join(resolved,'vendor/fflate.LICENSE.txt'));
  const html=await ejs.renderFile(path.join(root,'views/index.ejs'),{title:'VerdeStats'});
  await fs.writeFile(path.join(resolved,'index.html'),html);
  console.log('Built static browser application in dist/');
  return resolved;
}
if(require.main===module) build().catch(err=>{console.error(err.message);process.exitCode=1;});
module.exports={build};
