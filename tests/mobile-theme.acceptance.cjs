// Synthetic listening data; an optional TEST_BASE checks the served deployment.
const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {createServer}=require('../server'),{build}=require('../scripts/build');
const artifacts=process.env.ARTIFACTS||path.join(__dirname,'artifacts','mobile-theme');
(async()=>{
 let server,browser;
 try{
  await fs.mkdir(artifacts,{recursive:true});
  let base=process.env.TEST_BASE;
  if(!base){await build();server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;}
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
  const context=await browser.newContext({hasTouch:true,isMobile:true,timezoneId:'Europe/Berlin',viewport:{width:390,height:844}}),page=await context.newPage();
  const errors=[],requests=[],axe=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
  await page.addInitScript(()=>{window.cspErrors=[];document.addEventListener('securitypolicyviolation',e=>window.cspErrors.push(e.violatedDirective));});
  const noOverflow=async(label)=>{
   const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(overflow.width<=overflow.viewport,`${label}: ${JSON.stringify(overflow)}`);
  };
  const scan=async(label,include)=>{
   let builder=new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']);if(include)builder=builder.include(include);
   const result=await builder.analyze(),violations=result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));axe.push({label,violations});assert.deepEqual(violations,[],label);
  };
  await page.goto(base,{waitUntil:'networkidle'});
  assert.equal(await page.locator('html').getAttribute('data-theme'),'modern');assert.deepEqual(await page.evaluate(()=>({...localStorage})),{});
  for(const theme of ['modern','legacy'])for(const lang of ['en','de']){
   await page.locator(`#landing [data-theme-choice=${theme}]`).click();await page.locator(`#landing [data-language=${lang}]`).click();
   for(const width of [320,390,620,768,1440]){await page.setViewportSize({width,height:844});await noOverflow(`landing/${theme}/${lang}/${width}`);}
   await scan(`landing/${theme}/${lang}`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#landing [data-language=en]').click();await page.locator('#landing [data-theme-choice=modern]').click();
  const rows=[];
  for(const year of [2023,2024,2025])for(let day=1;day<=28;day++)rows.push({ts:`${year}-01-${String(day).padStart(2,'0')}T12:00:00Z`,ms_played:120000,master_metadata_track_name:day===1?'A very long song 東京 '.repeat(12):`Song ${day}`,master_metadata_album_artist_name:day===1?'Artist '.repeat(30):`Artist ${day%4}`,master_metadata_album_album_name:'Album '.repeat(20),platform:'Android',conn_country:'DE',skipped:false});
  const importData=async()=>{await page.locator('#file-input').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(rows))});await page.locator('#upload-btn').click();await page.waitForFunction(()=>!document.querySelector('#app').hidden&&!document.querySelector('#analyze-btn').disabled);};
  await importData();await page.waitForLoadState('networkidle');const afterImport=requests.length;
  const ready=()=>page.waitForFunction(()=>!document.querySelector('#analyze-btn').disabled&&document.querySelector('#job-progress').hidden);
  const navigate=async view=>{if(await page.locator('#menu-toggle').isVisible())await page.locator('#menu-toggle').click();await page.locator(`[data-view=${view}]`).click();await ready();};
  assert.equal(await page.locator('#filter-disclosure').getAttribute('open'),null);
  // Native modal traps focus, Escape closes it, and the trigger state follows.
  await page.locator('#menu-toggle').click();assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#navigation-dialog')),true);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#menu-toggle').getAttribute('aria-expanded')==='false');assert.equal(await page.locator('#navigation-dialog').getAttribute('open'),null);assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#menu-toggle').evaluate(el=>el===document.activeElement),true);
  await page.locator('#menu-toggle').click();await page.setViewportSize({width:1100,height:844});assert.equal(await page.locator('#navigation-dialog').getAttribute('open'),null);assert.equal(await page.locator('#desktop-navigation-slot [data-view]').count(),11);
  await page.setViewportSize({width:390,height:844});
  await page.locator('#filter-disclosure>summary').click();await page.locator('#period').selectOption('custom');await page.locator('#start-date').fill('2024-01-01');await page.locator('#end-date').fill('2024-01-28');await page.locator('#analyze-btn').click();await ready();assert.equal(await page.locator('#filter-disclosure').getAttribute('open'),null);assert.match(await page.locator('#range-summary').innerText(),/2024/);
  for(const theme of ['modern','legacy'])for(const lang of ['en','de']){
   await page.locator(`#app [data-theme-choice=${theme}]`).click();await page.locator(`#app [data-language=${lang}]`).click();
   const expectedBG=theme==='legacy'?'rgb(5, 5, 5)':'rgb(13, 17, 23)';assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),expectedBG);
   for(const width of [320,390,620,768,800,801,1100,1440]){
    await page.setViewportSize({width,height:844});
    for(const view of ['overview','songs','artists','albums','history','listening','compare','discoveries','recaps','exports','data']){
     await navigate(view);await noOverflow(`${theme}/${lang}/${width}/${view}`);
     if(width===390){await scan(`${theme}/${lang}/${view}`);if(['overview','songs','listening','compare','recaps','exports'].includes(view))await page.screenshot({path:path.join(artifacts,`${theme}-${lang}-${view}.png`),fullPage:true});}
    }
    // Expanded date controls must also fit; 16px inputs avoid iOS focus zoom.
    if(width<=800){await page.locator('#filter-disclosure>summary').click();await noOverflow(`filters/${theme}/${lang}/${width}`);assert.equal(await page.locator('#start-date').evaluate(el=>getComputedStyle(el).fontSize),'16px');await page.locator('#filter-disclosure>summary').click();}
   }
   checks.push({theme,lang,widths:8,views:11});console.log(`Passed ${theme}/${lang}: all views and widths`);
  }
  await page.setViewportSize({width:320,height:640});await navigate('overview');
  await page.locator('#customize-widgets').click();await noOverflow('widgets dialog');await scan('widgets dialog');await page.locator('#widgets-dialog [data-close]').click();
  await navigate('songs');await page.locator('.entity-button').first().click();await noOverflow('entity dialog');await scan('entity dialog');await page.screenshot({path:path.join(artifacts,'legacy-de-entity.png'),fullPage:true});await page.locator('#detail-dialog [data-close]').click();
  await page.locator('#global-search').fill('Song');await page.waitForSelector('#search-results:not([hidden])');await noOverflow('global search');await scan('search','#search-results');await page.keyboard.press('Escape');
  await page.locator('#menu-toggle').click();await noOverflow('navigation');await scan('navigation');await page.keyboard.press('Escape');
  await page.setViewportSize({width:700,height:320});await page.locator('#menu-toggle').click();await page.locator('[data-view=exports]').click();assert.equal(await page.locator('#navigation-dialog').getAttribute('open'),null);await noOverflow('landscape');
  // Appearance changes do not clear applied filters, results or trigger data requests.
  assert.match(await page.locator('#range-summary').innerText(),/2024/);assert.equal(requests.length,afterImport);assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.cspErrors),[]);
  assert.deepEqual(await page.evaluate(()=>({...localStorage})),{'verdestats-language':'de','verdestats-theme':'legacy'});assert.deepEqual(await context.cookies(),[]);assert.equal(await page.evaluate(()=>sessionStorage.length),0);assert.deepEqual(await page.evaluate(()=>indexedDB.databases()),[]);
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#app').isVisible(),false);assert.equal(await page.locator('html').getAttribute('data-theme'),'legacy');assert.equal(await page.locator('html').getAttribute('lang'),'de');
  await page.locator('#landing [data-theme-choice=modern]').click();await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'modern');
  // Both settings still work when storage is blocked.
  const blocked=await browser.newContext({viewport:{width:320,height:640}});const denied=await blocked.newPage();await denied.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked');};Storage.prototype.setItem=()=>{throw new Error('blocked');};});await denied.goto(base);await denied.locator('#landing [data-theme-choice=legacy]').click();await denied.locator('#landing [data-language=de]').click();assert.equal(await denied.locator('html').getAttribute('data-theme'),'legacy');assert.equal(await denied.locator('html').getAttribute('lang'),'de');await blocked.close();
  await fs.writeFile(path.join(artifacts,'result.json'),JSON.stringify({success:true,base,checks,axe,errors,requests:requests.length},null,2));console.log(JSON.stringify({success:true,artifacts,checks:'both themes, EN/DE, all 11 views at 8 widths, landing, modal focus/Escape/resize, collapsed/applied filters, search/details/widgets, landscape, no data requests, storage whitelist, reload and blocked storage'}));
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
