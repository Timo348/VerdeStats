const test=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('../server');
const {build}=require('../scripts/build');
test('static app rejects uploads, protects browser data and uses only local assets',async t=>{
  await build();
  const server=createServer().listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const home=await fetch(base);
  assert.equal(home.status,200);
  assert.equal(home.headers.get('set-cookie'),null);
  assert.equal(home.headers.get('cache-control'),'no-store');
  assert.equal(home.headers.get('referrer-policy'),'no-referrer');
  assert.match(home.headers.get('content-security-policy'),/connect-src 'none'/);
  const html=await home.text();
  assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)=["']https?:\/\//);
  assert.match(html,/favicon/);
  for(const target of ['/api/upload','/api/analyze','/']) {
    assert.equal((await fetch(base+target,{method:'POST',body:'test'})).status,405);
  }
  assert.equal((await fetch(base+'/uploads/.gitkeep')).status,404);
  assert.equal((await fetch(base+'/healthz')).status,200);
  assert.equal((await fetch(base+'/%2e%2e%2fpackage.json')).status,404);
  const malformedStatus=await new Promise((resolve,reject)=>{
    require('node:http').get({hostname:'127.0.0.1',port:server.address().port,path:'//%'},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);
  });
  assert.equal(malformedStatus,400);
  assert.equal((await fetch(base+'/healthz')).status,200);
});
