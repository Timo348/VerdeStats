const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('./scripts/build');
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const headers = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'X-Frame-Options':'DENY',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()', 'Cache-Control':'no-store'
};
function createServer(directory = path.join(__dirname,'dist')) {
  return http.createServer((req,res) => {
    for (const [key,value] of Object.entries(headers)) res.setHeader(key,value);
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, {'Allow':'GET, HEAD'}); return res.end(); }
    let pathname;
    try { pathname = new URL(req.url,'http://localhost').pathname; }
    catch (_) { res.writeHead(400); return res.end(); }
    if (pathname === '/healthz') { res.writeHead(200,{'Content-Type':'application/json'}); return res.end(req.method === 'HEAD' ? '' : '{"status":"ok"}'); }
    let relative;
    try { relative=decodeURIComponent(pathname); } catch (_) { res.writeHead(400); return res.end(); }
    const full = path.resolve(directory,relative === '/' ? 'index.html' : '.'+relative);
    if (!full.startsWith(path.resolve(directory)+path.sep)) { res.writeHead(404); return res.end(); }
    fs.stat(full,(err,stat) => {
      if (err || !stat.isFile()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, {'Content-Type':MIME[path.extname(full)]||'application/octet-stream'});
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(full).on('error',()=>res.destroy()).pipe(res);
    });
  });
}
if (require.main === module) build().then(() => {
  const server = createServer().listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('VerdeStats: http://localhost:'+server.address().port));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>process.exit(0)));
}).catch(err=>{console.error(err.message);process.exitCode=1;});
module.exports={createServer};
