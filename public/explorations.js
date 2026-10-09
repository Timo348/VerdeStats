/* Pure browser/worker calculations. No storage, network or original fields. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./analyzer') : root.VerdeAnalyzer);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VerdeExplorations = api;
})(typeof self === 'object' ? self : globalThis, function (A) {
  'use strict';
  const DAY = 86400000;
  const key = A.dateKey;
  const ordinal = time => { const d = new Date(time); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY; };
  const nextMonth = month => { const [y,m] = month.split('-').map(Number); return key(new Date(y,m,1)).slice(0,7); };
  const monday = time => { const d = new Date(time); d.setDate(d.getDate()-(d.getDay()+6)%7); return key(d); };
  function rank(entries, kind, limit = 10) {
    const map = new Map(), field = kind === 'songs' ? 'songId' : kind === 'albums' ? 'albumId' : 'artistId';
    for (const e of entries) {
      const row = map.get(e[field]) || { id:e[field], name:kind==='songs'?e.name:kind==='albums'?e.album:e.artist, artist:kind==='artists'?'':e.artist, ms:0, streams:0 };
      row.ms+=e.ms; row.streams++; map.set(row.id,row);
    }
    return [...map.values()].sort((a,b)=>b.ms-a.ms||b.streams-a.streams||a.name.localeCompare(b.name)||a.id.localeCompare(b.id)).slice(0,limit);
  }
  function snapshot(eligible, archive, options, first) {
    const v = A.validateOptions(options);
    const start = v.start ?? A.validateOptions({startDate:key(archive[0].time)}).start;
    const end = v.end ?? A.validateOptions({endDate:key(archive.at(-1).time)}).end;
    if (end<=start) throw new Error('Start date must be before end date');
    const rows=eligible.filter(e=>e.time>=start&&e.time<end), active=new Set(), songs=new Set(), artists=new Set(), discovered=new Set();
    let ms=0, newMs=0, newPlays=0;
    const daily=new Map(), monthly=new Map();
    for(const e of rows) {
      ms+=e.ms; songs.add(e.songId); artists.add(e.artistId);
      if(e.ms>0) active.add(key(e.time));
      if(first.get(e.songId)===e&&!discovered.has(e.songId)) {discovered.add(e.songId);newMs+=e.ms;newPlays++;}
      for(const [map,k] of [[daily,key(e.time)],[monthly,key(e.time).slice(0,7)]]) {const r=map.get(k)||{period:k,ms:0,streams:0};r.ms+=e.ms;r.streams++;map.set(k,r);}
    }
    const calendarDays=ordinal(end)-ordinal(start);
    const archiveStart=ordinal(archive[0].time),archiveEnd=ordinal(archive.at(-1).time);
    const overlapDays=Math.max(0,Math.min(ordinal(end)-1,archiveEnd)-Math.max(ordinal(start),archiveStart)+1);
    return { start:key(start),end:key(end-1),calendarDays,overlapDays,coverage:overlapDays===0?'outside':overlapDays===calendarDays?'within':'partial',ms,streams:rows.length,uniqueSongs:songs.size,uniqueArtists:artists.size,activeDays:active.size,avgMsPerDay:ms/calendarDays,newMs,newPlays,newSongs:discovered.size,repeatMs:ms-newMs,repeatPlays:rows.length-newPlays,library:{songs:rank(rows,'songs'),artists:rank(rows,'artists'),albums:rank(rows,'albums')},daily:[...daily.values()],monthly:[...monthly.values()] };
  }
  function explore(entries, options={}, request={}) {
    if(!entries.length) throw new Error('No valid Spotify listening history found');
    const v=A.validateOptions(options);
    const typed=entries.filter(e=>v.type==='all'||e.type===v.type),eligible=typed.filter(e=>e.ms>=v.minMs),first=new Map();
    for(const e of typed) if(!first.has(e.songId)) first.set(e.songId,e);
    const current=snapshot(eligible,entries,options,first);
    const selected=eligible.filter(e=>key(e.time)>=current.start&&key(e.time)<=current.end);
    const months=new Map();for(const e of selected){const m=key(e.time).slice(0,7);if(!months.has(m))months.set(m,[]);months.get(m).push(e);}
    const trends=[...months].map(([month,rows])=>({month,ms:rows.reduce((n,e)=>n+e.ms,0),artists:rank(rows,'artists')}));
    const phases=[];
    for(const month of trends) {
      const leader=month.artists[0];if(!leader||!month.ms||leader.ms/month.ms<0.5||leader.streams<10)continue;
      const last=phases.at(-1);
      if(last&&last.id===leader.id&&nextMonth(last.end)===month.month){last.end=month.month;last.ms+=leader.ms;last.totalMs+=month.ms;last.streams+=leader.streams;}
      else phases.push({id:leader.id,name:leader.name,start:month.month,end:month.month,ms:leader.ms,totalMs:month.ms,streams:leader.streams});
    }
    const years=new Set(eligible.map(e=>new Date(e.time).getFullYear())), artistYears=new Map();
    for(const e of eligible){if(!artistYears.has(e.artistId))artistYears.set(e.artistId,{id:e.artistId,name:e.artist,years:new Map()});const row=artistYears.get(e.artistId);const y=new Date(e.time).getFullYear();row.years.set(y,(row.years.get(y)||0)+1);}
    const consistent=[...artistYears.values()].map(r=>({...r,years:[...r.years].filter(([,count])=>count>=10).map(([y])=>y).sort()})).filter(r=>r.years.length>=2).sort((a,b)=>b.years.length-a.years.length||a.name.localeCompare(b.name)).slice(0,50);
    const weeks=new Map();for(const e of selected){const week=monday(e.time),id=JSON.stringify([week,e.songId]);const row=weeks.get(id)||{id:e.songId,name:e.name,artist:e.artist,start:week,streams:0,ms:0};row.streams++;row.ms+=e.ms;weeks.set(id,row);}
    // Index counts once: do not scan the full archive for each candidate week.
    const dayCounts=new Map();for(const e of eligible){if(!dayCounts.has(e.songId))dayCounts.set(e.songId,new Map());const m=dayCounts.get(e.songId),d=ordinal(e.time);m.set(d,(m.get(d)||0)+1);}
    const obsessions=[];
    for(const row of weeks.values()){
      if(row.streams<10)continue;
      const d=ordinal(new Date(row.start+'T12:00:00')),followEnd=d+34;
      if(followEnd>ordinal(entries.at(-1).time)||followEnd>ordinal(new Date(current.end+'T12:00:00')))continue;
      let later=0;for(let n=d+7;n<=followEnd;n++)later+=dayCounts.get(row.id)?.get(n)||0;
      if(later<=row.streams*0.2)obsessions.push({...row,followingPlays:later});
    }
    obsessions.sort((a,b)=>b.streams-a.streams||a.start.localeCompare(b.start));
    const onDate=request.onDate||key(Date.now());A.validateOptions({startDate:onDate,endDate:onDate});
    const suffix=onDate.slice(5),year=Number(onDate.slice(0,4)),onDayYears=new Map();
    for(const e of eligible){const day=key(e.time);if(day.slice(5)===suffix&&Number(day.slice(0,4))<year){const y=day.slice(0,4);if(!onDayYears.has(y))onDayYears.set(y,[]);onDayYears.get(y).push(e);}}
    const onDay=[...onDayYears].sort(([a],[b])=>b.localeCompare(a)).map(([year,rows])=>({year,streams:rows.length,ms:rows.reduce((n,e)=>n+e.ms,0),songs:rank(rows,'songs',5),artists:rank(rows,'artists',5)}));
    const groups=['Morning','Daytime','Evening','Night'].map(name=>({name,rows:[]}));
    const weekGroups=['Weekdays','Weekend'].map(name=>({name,rows:[]}));
    for(const e of selected){const d=new Date(e.time),h=d.getHours();groups[h>=5&&h<12?0:h>=12&&h<18?1:h>=18&&h<23?2:3].rows.push(e);weekGroups[[0,6].includes(d.getDay())?1:0].rows.push(e);}
    const group=g=>{const dates=new Set(g.rows.filter(e=>e.ms>0).map(e=>key(e.time))),seen=new Set();let repeats=0;for(const e of g.rows){if(first.get(e.songId)!==e||seen.has(e.songId))repeats++;seen.add(e.songId);}return {name:g.name,ms:g.rows.reduce((n,e)=>n+e.ms,0),streams:g.rows.length,activeDays:dates.size,repeatPlays:repeats,songs:rank(g.rows,'songs',5),artists:rank(g.rows,'artists',5)};};
    let comparison=null;if(request.a&&request.b)comparison={a:snapshot(eligible,entries,{...options,...request.a},first),b:snapshot(eligible,entries,{...options,...request.b},first)};
    let previous=null;if(request.previous)previous=snapshot(eligible,entries,{...options,...request.previous},first);
    let recap=null;if(request.recap)recap=snapshot(eligible,entries,{...options,...request.recap},first);
    return {current,comparison,recap,previous,trends,phases,consistent,obsessions:obsessions.slice(0,50),onDate,onDay,timeGroups:groups.map(group),weekGroups:weekGroups.map(group),years:[...years].sort((a,b)=>b-a),archive:{start:key(entries[0].time),end:key(entries.at(-1).time)},type:v.type,minMs:v.minMs};
  }
  return { explore, rank };
});
