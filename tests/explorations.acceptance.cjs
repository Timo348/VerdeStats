/* Synthetic data only. Local preview by default; TEST_BASE enables deployment verification. */
const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {createServer}=require('../server'),{build}=require('../scripts/build');
(async()=>{
 let server,browser;const artifacts=process.env.ARTIFACTS||path.join(__dirname,'artifacts','explorations');await fs.mkdir(artifacts,{recursive:true});
 try{
  let base=process.env.TEST_BASE;
  if(!base){await build();server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;}
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
  const context=await browser.newContext({timezoneId:'Europe/Berlin',viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],requests=[],axe=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
  await page.addInitScript(()=>{window.violations=[];document.addEventListener('securitypolicyviolation',e=>window.violations.push(e.violatedDirective));});
  await page.goto(base,{waitUntil:'networkidle'});
  const row=(ts,name='Björk, 東京',artist='Artist',ms=60000)=>({ts,ms_played:ms,master_metadata_track_name:name,master_metadata_album_artist_name:artist,master_metadata_album_album_name:'Album',username:'PRIVATE_MARKER',ip_addr:'PRIVATE_MARKER'});
  const rows=[];for(const year of [2023,2024,2025])for(const month of ['01','02'])for(let n=1;n<=12;n++)rows.push(row(`${year}-${month}-${String(n).padStart(2,'0')}T12:00:00Z`));
  rows.push(row('2024-03-31T21:59:59Z','=HYPERLINK("https://example.com")','<img src="https://example.com/leak">'));rows.push(row('2024-04-01T12:00:00Z','Other','Other artist'));rows.push(row('2025-04-01T12:00:00Z','Other','Other artist'));
  await page.locator('#file-input').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(rows))});await page.locator('#upload-btn').click();
  const ready=()=>page.waitForFunction(()=>!document.querySelector('#analyze-btn').disabled&&!document.querySelector('#job-progress').hidden===false);
  await page.waitForFunction(()=>!document.querySelector('#app').hidden);await ready();await page.waitForLoadState('networkidle');const requestsAfterImport=requests.length;
  const navigate=async view=>{if(await page.locator('#menu-toggle').isVisible())await page.locator('#menu-toggle').click();await page.locator(`[data-view="${view}"]`).click();await ready();};
  const submit=async()=>{await page.locator('#explore-form button[type="submit"],#explore-form button:not([type])').click();await ready();};
  await navigate('compare');assert.match(await page.locator('#view-content').innerText(),/B compared with A/);
  await page.locator('#compare-year-a').selectOption('2023');await page.locator('#compare-year-b').selectOption('2024');await submit();assert.match(await page.locator('#view-content').innerText(),/Jan 1, 2023/);
  await page.locator('#compare-mode').selectOption('custom');await page.locator('#compare-start-a').fill('2024-03-31');await page.locator('#compare-end-a').fill('2024-03-31');await page.locator('#compare-start-b').fill('2020-01-01');await page.locator('#compare-end-b').fill('2020-01-31');await submit();assert.match(await page.locator('#view-content').innerText(),/Outside archive boundaries/);assert.equal(await page.locator('#view-content img').count(),0);
  await page.locator('#compare-start-a').fill('2024-04-01');await submit();assert.match(await page.locator('#app-status').innerText(),/Start date/);await page.locator('#compare-end-a').fill('2024-04-01');await submit();assert.equal(await page.locator('#app-status').innerText(),'');
  await navigate('discoveries');assert.match(await page.locator('#view-content').innerText(),/Monthly artist ranks/);assert.match(await page.locator('#view-content').innerText(),/2023, 2024, 2025/);
  await page.locator('#on-date').fill('2025-01-01');await submit();assert.match(await page.locator('#view-content').innerText(),/2024/);assert.equal(await page.locator('.explore-table tbody tr').count(),9);
  await navigate('recaps');await page.locator('#recap-mode').selectOption('month');await page.locator('#recap-month').fill('2024-02');await submit();assert.match(await page.locator('#view-content').innerText(),/Feb 29, 2024/);
  await page.locator('#recap-mode').selectOption('custom');await page.locator('#recap-start').fill('2024-01-01');await page.locator('#recap-end').fill('2024-02-29');await page.locator('#recap-name').fill('<img src="https://example.com/recap"> 東京');await submit();assert.equal(await page.locator('#view-content img').count(),0);assert.match(await page.locator('#view-content h3').first().innerText(),/東京/);
  const saveDownload=async(selector,file)=>{const pending=page.waitForEvent('download');await page.locator(selector).click();const download=await pending;await download.saveAs(path.join(artifacts,file));return fs.readFile(path.join(artifacts,file));};
  const recap=await saveDownload('#recap-pdf','recap.pdf');assert.ok(recap.subarray(0,8).toString().startsWith('%PDF-1.4'));
  await navigate('exports');const csv=await saveDownload('#export-csv','songs.csv');assert.match(csv.toString(),/"'=HYPERLINK/);assert.match(csv.toString(),/Björk, 東京/);assert.doesNotMatch(csv.toString(),/PRIVATE_MARKER/);
  for(const kind of ['artists','albums','daily','monthly']){await page.locator('#export-table').selectOption(kind);const data=await saveDownload('#export-csv',kind+'.csv');assert.ok(data.length>30);}
  const pdf=await saveDownload('#export-pdf','report.pdf');assert.ok(pdf.subarray(0,8).toString().startsWith('%PDF-1.4'));
  // Applied filters survive edits which have not been submitted.
  await page.locator('#min-seconds').fill('86400');await saveDownload('#export-pdf','still-applied.pdf');await page.locator('#analyze-btn').click();await ready();
  const blank=await saveDownload('#export-csv','empty.csv');assert.equal(blank.toString().trim().split('\r\n').length,1);
  await page.locator('#min-seconds').fill('0');await page.locator('#analyze-btn').click();await ready();
  for(const language of ['en','de']){
   await page.locator(`#app [data-language="${language}"]`).click();
   for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const view of ['compare','discoveries','recaps','exports']){
     await navigate(view);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${language}/${width}/${view} overflow: ${JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('#view-content *')].filter(el=>el.getBoundingClientRect().right>innerWidth).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,80),right:el.getBoundingClientRect().right}))))}`);
     if(width===1440){const scan=await new AxeBuilder({page}).include('#view-content').withTags(['wcag2a','wcag2aa']).analyze();axe.push({language,view,violations:scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});assert.deepEqual(scan.violations.map(v=>v.id),[],`${language}/${view} accessibility`);}
     if(width===390)await page.screenshot({path:path.join(artifacts,`${language}-${view}-mobile.png`),fullPage:true});
    }
   }
  }
  assert.equal(requests.length,requestsAfterImport,'no further requests after import');assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.violations),[]);
  assert.deepEqual(await context.cookies(),[]);assert.deepEqual(await page.evaluate(()=>({...localStorage})),{'verdestats-language':'de'});assert.equal(await page.evaluate(()=>sessionStorage.length),0);assert.deepEqual(await page.evaluate(()=>indexedDB.databases()),[]);assert.deepEqual(await page.evaluate(()=>navigator.serviceWorker?navigator.serviceWorker.getRegistrations():[]),[]);
  await navigate('data');await page.locator('#view-content [data-discard]').click();assert.equal(await page.locator('#view-content').innerText(),'');await page.reload();assert.equal(await page.locator('#app').isVisible(),false);assert.equal(await page.locator('html').getAttribute('lang'),'de');
  await fs.writeFile(path.join(artifacts,'browser-result.json'),JSON.stringify({success:true,base,requests:requests.length,axe,errors},null,2));console.log(JSON.stringify({success:true,base,checks:'year/custom comparisons, invalid/empty periods, all discovery panels, year/month/custom recaps, CSV/PDF downloads, Unicode/XSS, applied filters, EN/DE at 1440/768/390/320px, Axe WCAG A/AA, RAM/privacy/discard/reload',artifacts}));
 }finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
