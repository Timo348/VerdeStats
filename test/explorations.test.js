const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../public/analyzer'),E=require('../public/explorations'),X=require('../public/exports');
const vm=require('node:vm'),fs=require('node:fs');
process.env.TZ='Europe/Berlin';
const raw=(ts,name='Song',artist='Artist',ms=60000,extra={})=>({ts,ms_played:ms,master_metadata_track_name:name,master_metadata_album_artist_name:artist,master_metadata_album_album_name:'Album',...extra});
const normalized=rows=>A.normalizeEntries(rows);
const range=(startDate,endDate)=>({startDate,endDate});

test('separate year comparison has genuine totals, boundaries, lengths and no rank changes',()=>{
 const rows=normalized([raw('2023-12-31T23:10:00Z'),raw('2024-06-01T12:00:00Z'),raw('2025-01-01T12:00:00Z')]);
 const r=E.explore(rows,{}, {a:range('2024-01-01','2024-12-31'),b:range('2025-01-01','2025-12-31')});
 assert.equal(r.comparison.a.streams,2);assert.equal(r.comparison.a.calendarDays,366);assert.equal(r.comparison.a.coverage,'within');assert.equal(r.comparison.b.streams,1);assert.equal(r.comparison.b.overlapDays,1);assert.equal(r.comparison.b.coverage,'partial');
 assert.equal(r.comparison.a.library.songs[0].streams,2);assert.doesNotMatch(JSON.stringify(r),/previousRank|rankChange|comeback|forgotten|username|ip_addr/);
});
test('inclusive arbitrary periods and DST averages use civil days',()=>{
 const rows=normalized([raw('2024-03-30T23:30:00Z'),raw('2024-03-31T21:59:59Z'),raw('2024-03-31T22:00:00Z')]);
 const r=E.explore(rows,range('2024-03-31','2024-03-31'),{a:range('2024-03-31','2024-03-31'),b:range('2024-03-30','2024-04-01')});
 assert.equal(r.current.calendarDays,1);assert.equal(r.current.streams,2);assert.equal(r.current.avgMsPerDay,120000);assert.equal(r.comparison.b.calendarDays,3);assert.equal(r.comparison.b.avgMsPerDay,60000);
});
test('empty and fully uncovered windows have no invented favourites or ratios',()=>{
 const r=E.explore(normalized([raw('2024-01-01T12:00:00Z')]),range('2020-01-01','2020-01-31'));
 assert.equal(r.current.ms,0);assert.equal(r.current.overlapDays,0);assert.equal(r.current.coverage,'outside');assert.deepEqual(r.current.library.songs,[]);assert.deepEqual(r.phases,[]);
});
test('first plays respect full import before minimum-duration and selected-date filters',()=>{
 const rows=normalized([raw('2023-12-01T12:00:00Z','Repeat','Artist',1000),raw('2024-01-01T12:00:00Z','Repeat'),raw('2024-01-02T12:00:00Z','New'),raw('2024-01-02T13:00:00Z','New')]);
 const r=E.explore(rows,{...range('2024-01-01','2024-01-31'),minMs:30000}).current;
 assert.equal(r.newSongs,1);assert.equal(r.newPlays,1);assert.equal(r.repeatPlays,2);assert.equal(r.newMs+r.repeatMs,r.ms);
});
test('monthly artist ranks and dominance merge adjacent months and require thresholds',()=>{
 const rows=[];for(const month of ['01','02','04'])for(let n=1;n<=10;n++)rows.push(raw(`2024-${month}-${String(n).padStart(2,'0')}T12:00:00Z`));rows.push(raw('2024-03-01T12:00:00Z','Other','Other artist'));
 const r=E.explore(normalized(rows));assert.equal(r.trends.length,4);assert.equal(r.trends[0].artists[0].name,'Artist');assert.equal(r.phases.length,2);assert.equal(r.phases[0].start,'2024-01');assert.equal(r.phases[0].end,'2024-02');assert.equal(r.phases[0].streams,20);
});
test('consistent artists require ten plays in multiple years and preserve imported year gaps',()=>{
 const rows=[];for(const year of [2022,2024])for(let n=1;n<=10;n++)rows.push(raw(`${year}-01-${String(n).padStart(2,'0')}T12:00:00Z`));rows.push(raw('2023-01-01T12:00:00Z'));
 const r=E.explore(normalized(rows),range('2024-01-01','2024-12-31'));assert.deepEqual(r.consistent[0].years,[2022,2024]);
});
test('intense week requires the entire following 28-day window, including range boundaries',()=>{
 const rows=[];for(let n=0;n<10;n++)rows.push(raw(`2024-01-01T${String(n+1).padStart(2,'0')}:00:00Z`));rows.push(raw('2024-02-04T12:00:00Z','Other'));const history=normalized(rows);
 assert.equal(E.explore(history).obsessions.length,1);assert.equal(E.explore(history,range('2024-01-01','2024-02-03')).obsessions.length,0);
 const repeated=normalized([...rows,raw('2024-01-08T12:00:00Z'),raw('2024-01-09T12:00:00Z'),raw('2024-01-10T12:00:00Z')]);assert.equal(E.explore(repeated).obsessions.length,0);
});
test('on-this-day supports leap day and excludes selected-date/current/future-year noise',()=>{
 const rows=normalized([raw('2020-02-29T12:00:00Z'),raw('2024-02-29T12:00:00Z'),raw('2025-02-28T12:00:00Z')]);
 const r=E.explore(rows,range('2025-01-01','2025-12-31'),{onDate:'2024-02-29'});assert.deepEqual(r.onDay.map(r=>r.year),['2020']);
 assert.throws(()=>E.explore(rows,{}, {onDate:'2023-02-29'}),/Invalid/);
});
test('daypart edges and weekday/weekend groups obey local time and partition totals',()=>{
 const rows=normalized(['04','05','11','12','17','18','22','23'].map(h=>raw(`2024-06-03T${h}:00:00+02:00`)).concat([raw('2024-06-02T12:00:00+02:00')]));
 const r=E.explore(rows);assert.deepEqual(r.timeGroups.map(g=>g.streams),[2,3,2,2]);assert.deepEqual(r.weekGroups.map(g=>g.streams),[8,1]);assert.equal(r.timeGroups.reduce((n,g)=>n+g.ms,0),r.current.ms);assert.equal(r.weekGroups.reduce((n,g)=>n+g.repeatPlays,0),r.current.repeatPlays);
});
test('recaps and previous periods remain independent of the selected dashboard range',()=>{
 const rows=normalized([raw('2023-01-01T12:00:00Z'),raw('2024-01-01T12:00:00Z'),raw('2024-02-01T12:00:00Z')]);
 const r=E.explore(rows,range('2024-02-01','2024-02-29'),{recap:range('2024-01-01','2024-12-31'),previous:range('2023-01-01','2023-12-31')});assert.equal(r.current.streams,1);assert.equal(r.recap.streams,2);assert.equal(r.previous.streams,1);
});
test('podcast/all filters retain separate identities and private fields never enter results',()=>{
 const rows=normalized([raw('2024-01-01T12:00:00Z','Same','Same',60000,{ip_addr:'SECRET',username:'SECRET'}),{ts:'2024-01-02T12:00:00Z',ms_played:60000,episode_name:'Same',episode_show_name:'Same'}]);
 const r=E.explore(rows,{type:'podcast'});assert.equal(r.current.streams,1);assert.equal(r.current.library.songs[0].name,'Same');assert.equal(E.explore(rows,{type:'all'}).current.uniqueSongs,2);assert.doesNotMatch(JSON.stringify(r),/SECRET|ip_addr|username/);
});
test('invalid dates, reverse intervals and empty archives fail clearly',()=>{
 const rows=normalized([raw('2024-01-01T12:00:00Z')]);assert.throws(()=>E.explore([],{}),/No valid/);assert.throws(()=>E.explore(rows,{}, {a:range('2024-02-30','2024-03-01'),b:range('2024-01-01','2024-02-01')}),/Invalid/);assert.throws(()=>E.explore(rows,range('2024-02-01','2024-01-01')),/Start date/);
});
test('CSV protects formula/control prefixes and quotes separators, newlines and Unicode',()=>{
 const data=X.csv(['Name','Plays'],[['=1+1',2],['\t@cmd',3],[' +SUM(1)',4],['-1',5],['Björk, "東京"\nnext',6]]);
 assert.ok(data.startsWith('\uFEFF'));assert.match(data,/"'=1\+1"/);assert.match(data,/"'\t@cmd"/);assert.match(data,/Björk, ""東京""\nnext/);assert.match(data,/\r\n$/);
});
test('CSV tables export all selected rows with milliseconds and no identity/private columns',()=>{
 const r=A.analyzeEntries(normalized([raw('2024-01-01T12:00:00Z','Song','Artist',61000,{ip_addr:'SECRET'})]));
 const csv=X.csvTable(r,'songs',s=>s);assert.match(csv,/,"61000","1"/);assert.doesNotMatch(csv,/SECRET|songId|spotify:/);assert.match(X.csvTable(r,'daily',s=>s),/2024-01-01/);
});
test('PDF structure uses byte-accurate object offsets, stream lengths and independent pages',()=>{
 const bytes=X.pdfFromJpegs([{width:2,height:2,bytes:Uint8Array.from([255,216,255,217])},{width:2,height:2,bytes:Uint8Array.from([255,216,255,217])}]);
 const text=Buffer.from(bytes).toString('latin1');assert.ok(text.startsWith('%PDF-1.4'));assert.match(text,/\/Count 2/);const offset=Number(/startxref\n(\d+)/.exec(text)[1]);assert.equal(text.slice(offset,offset+4),'xref');const records=text.slice(offset).split('\n').slice(3,11);for(let i=0;i<records.length;i++)assert.equal(text.slice(Number(records[i].slice(0,10))).startsWith(`${i+1} 0 obj`),true);
});
test('worker explorations run against imported RAM state and clearing prevents further analysis',async()=>{
 const messages=[],self={postMessage:r=>messages.push(structuredClone(r))};const context=vm.createContext({self,importScripts(){},VerdeAnalyzer:A,VerdeExplorations:E,Uint8Array,TextDecoder,DataView,Error});vm.runInContext(fs.readFileSync(require.resolve('../public/worker.js'),'utf8'),context);
 await self.onmessage({data:{id:1,type:'import',files:[new File([JSON.stringify([raw('2024-01-01T12:00:00Z')])],'history.json')]}});
 await self.onmessage({data:{id:2,type:'explore',request:{recap:range('2024-01-01','2024-12-31')}}});assert.equal(messages.find(m=>m.id===2&&m.type==='exploration').result.recap.streams,1);
 await self.onmessage({data:{id:3,type:'clear'}});await self.onmessage({data:{id:4,type:'explore'}});assert.equal(messages.find(m=>m.id===4&&m.type==='error').error,'No valid Spotify listening history found');
});

test('new UI and export messages have German translations, English remains the fallback',()=>{
 const context={window:{},document:{documentElement:{},addEventListener(){}},localStorage:{getItem(){return 'de'}}};vm.runInNewContext(fs.readFileSync(require.resolve('../public/i18n.js'),'utf8'),context);
 const keys=new Set();for(const f of ['exploration-ui','exports']){const source=fs.readFileSync(require.resolve('../public/'+f),'utf8');for(const m of source.matchAll(/\b(?:t|card|heading)\('([^']+)'/g))keys.add(m[1]);for(const m of source.matchAll(/\b(?:input|select|yearSelect)\('[^']+','([^']+)'/g))keys.add(m[1]);}
 for(const key of keys)if(!['Name','h'].includes(key))assert.notEqual(context.window.i18n.t(key),key,'Missing German text: '+key);
 context.localStorage.getItem=()=>null;vm.runInNewContext(fs.readFileSync(require.resolve('../public/i18n.js'),'utf8'),context);for(const key of keys)assert.equal(context.window.i18n.t(key),key);
});
