'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const t = key => window.i18n.t(key);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const num = value => Number(value || 0).toLocaleString(i18n.locale);
  const pct = value => `${Number(value || 0).toLocaleString(i18n.locale, {maximumFractionDigits:1})}%`;
  const date = value => value ? new Date(String(value).length === 10 ? `${value}T12:00:00` : value).toLocaleDateString(i18n.locale, {year:'numeric',month:'short',day:'numeric'}) : '—';
  const dateTime = value => value ? new Date(value).toLocaleString(i18n.locale, {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  const duration = ms => {
    const seconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    if (seconds >= 3600) return `${num(Math.floor(seconds / 3600))} ${t('h')} ${Math.floor(seconds / 60) % 60} ${t('min')}`;
    if (seconds >= 60) return `${num(Math.floor(seconds / 60))} ${t('min')} ${seconds % 60} ${t('s')}`;
    return `${seconds} ${t('s')}`;
  };
  const shortTime = ms => Number(ms || 0) >= 3600000 ? `${(ms/3600000).toLocaleString(i18n.locale,{maximumFractionDigits:1})} ${t('h')}` : duration(ms);
  const viewNames = {overview:'Overview',songs:'Songs',artists:'Artists',albums:'Albums',history:'History',listening:'Listening',data:'Data'};
  const widgetNames = {timeline:'Listening timeline',songs:'Top songs',artists:'Top artists',forgotten:'Forgotten favourites',calendar:'Daily listening calendar',milestones:'Personal milestones',habits:'Listening at a glance'};
  const state = {result:null,worker:null,request:0,pending:0,busy:false,view:'overview',page:1,sort:'ms',search:'',discovery:'all',granularity:'monthly',calendarYear:null,sessionPage:1,gap:30,detail:null,detailPage:1,files:[],widgets:Object.keys(widgetNames).map(id => ({id,enabled:true}))};
  const content = $('view-content');
  const empty = label => `<div class="empty">${t(label || 'No listening data in this range.')}</div>`;
  const heading = (title,sub,extra='') => `<div class="section-heading"><div><h2>${t(title)}</h2>${sub ? `<p>${t(sub)}</p>` : ''}</div>${extra}</div>`;
  const card = (label,value,note='',accent=false) => `<div class="stat-card"><div class="stat-label">${t(label)}</div><div class="stat-value${accent?' accent':''}">${value}</div>${note?`<div class="stat-note">${note}</div>`:''}</div>`;
  const songName = () => state.result?.type === 'podcast' ? 'Episodes' : 'Songs';
  const artistName = () => state.result?.type === 'podcast' ? 'Shows' : 'Artists';
  const sectionTitle = view => view === 'songs' ? songName() : view === 'artists' ? artistName() : viewNames[view];
  const entityButton = (entity,kind,body,className='') => `<button type="button" class="${className}" data-entity="${esc(entity.id)}" data-kind="${kind}">${body}</button>`;
  const badges = entity => entity.type==='podcast'?`<span class="badge neutral">${t('Podcast')}</span>`:'';
  const lookup = (id,kind) => state.result?.library[kind]?.find(entity => entity.id === id) || (state.result?.insights.forgotten || []).find(entity => entity.id === id && (entity.kind==='artist'?'artists':'songs') === kind);
  const localDateKey = value => {
    const day = new Date(value);
    return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
  };
  const periodLabel = (key,granularity) => {
    if (granularity==='yearly') return key;
    if (granularity==='monthly') return new Date(`${key}-01T12:00:00`).toLocaleDateString(i18n.locale,{month:'short',year:'2-digit'});
    return new Date(`${key}T12:00:00`).toLocaleDateString(i18n.locale,{month:'short',day:'numeric'});
  };
  const weekdayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const statsTooltip=document.createElement('div');
  statsTooltip.id='listening-tooltip';statsTooltip.className='stats-tooltip';statsTooltip.setAttribute('role','tooltip');statsTooltip.hidden=true;document.body.append(statsTooltip);
  let statsTarget=null,statsPinned=false,statsHideTimer=null,statsPointerType='mouse',statsHoverSuppressed=false;
  function hideStats() {
    clearTimeout(statsHideTimer);statsHideTimer=null;
    statsTarget?.removeAttribute('aria-describedby');statsTarget=null;statsPinned=false;
    statsTooltip.hidden=true;statsTooltip.replaceChildren();
  }
  function periodTitle(key,granularity) {
    if(granularity==='yearly')return key;
    if(granularity==='monthly')return new Date(`${key}-01T12:00:00`).toLocaleDateString(i18n.locale,{month:'long',year:'numeric'});
    if(granularity==='weekly')return `${t('Week of')} ${date(key)}`;
    return new Date(`${key}T12:00:00`).toLocaleDateString(i18n.locale,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  }
  function statsFor(target) {
    const data=target.dataset,result=state.result;
    if(!result)return null;
    if(data.stats==='heatmap') {
      const day=Number(data.statsDay),hour=Number(data.statsHour);
      return {title:`${t(weekdayNames[day])} · ${String(hour).padStart(2,'0')}:00–${String(hour+1).padStart(2,'0')}:00`,row:result.heatmapDetails?.[day]?.[hour]};
    }
    const key=data.statsKey,granularity=data.stats==='day'?'daily':data.granularity;
    const keyName={daily:'date',weekly:'week',monthly:'month',yearly:'year'}[granularity];
    const entity=data.statsEntity?lookup(data.statsEntity,data.statsKind):null;
    const rows=data.statsEntity?(entity?.monthly||[]):result[granularity];
    return {title:periodTitle(key,granularity),row:rows?.find(row=>String(row[keyName])===key),outside:data.stats==='day'&&(key<result.dateRange.start||key>result.dateRange.end)};
  }
  function tooltipTop(items,label) {
    if(!items?.length)return '';
    return `<div class="tooltip-section"><h3>${t(label)}</h3>${items.slice(0,3).map(item=>`<div class="tooltip-entry"><span><strong>${esc(item.name)}</strong>${item.artist?`<small>${esc(item.artist)}</small>`:''}</span><span>${shortTime(item.ms)}<small>${num(item.streams)} ${t('plays')}</small></span></div>`).join('')}</div>`;
  }
  function showStats(target) {
    clearTimeout(statsHideTimer);statsHideTimer=null;
    const details=statsFor(target);if(!details)return;
    if(statsTarget!==target){hideStats();statsTarget=target;}
    const row=details.row||{ms:0,streams:0},podcast=state.result.type==='podcast';
    const container=target.closest('dialog')||document.body;if(statsTooltip.parentElement!==container)container.append(statsTooltip);
    statsTooltip.innerHTML=`<div class="tooltip-heading">${esc(details.title)}</div><div class="tooltip-summary"><div><small>${t('Listening time')}</small><strong>${duration(row.ms)}</strong></div><div><small>${t('Plays')}</small><strong>${num(row.streams)}</strong></div></div>${row.streams?tooltipTop(row.topSongs,podcast?'Top episodes':'Top songs')+tooltipTop(row.topArtists,podcast?'Top shows':'Top artists'):`<p class="tooltip-empty">${t(details.outside?'Outside the selected range.':'No plays in this period.')}</p>`}<p class="tooltip-empty">${t('Within your selected filters.')}</p>`;
    statsTooltip.hidden=false;target.setAttribute('aria-describedby',statsTooltip.id);
    const rect=target.getBoundingClientRect(),width=statsTooltip.offsetWidth,height=statsTooltip.offsetHeight;
    const viewportWidth=document.documentElement.clientWidth,viewportHeight=document.documentElement.clientHeight;
    const left=Math.max(8,Math.min(viewportWidth-width-8,rect.left+rect.width/2-width/2));
    const top=rect.bottom+height+12<=viewportHeight?rect.bottom+8:Math.max(8,rect.top-height-8);
    statsTooltip.style.left=`${left}px`;statsTooltip.style.top=`${top}px`;
  }
  function chart(data,granularity='monthly',clickable=true) {
    if (!data?.length || !data.some(row=>row.ms>0)) return empty();
    const max = Math.max(...data.map(row=>row.ms));
    const keyName = {daily:'date',weekly:'week',monthly:'month',yearly:'year'}[granularity];
    return `<div class="chart-scroll"><div class="vertical-chart" style="min-width:${Math.max(340,data.length*38)}px">${data.map(row=>{
      const key = String(row[keyName]);
      const title = `${periodLabel(key,granularity)} · ${duration(row.ms)} · ${num(row.streams)} ${t('plays')}`;
      return `<${clickable?'button':'div'} ${clickable?'type="button"':'tabindex="0" role="img"'} class="chart-column" ${clickable?`data-period="${esc(key)}"`:''} data-stats="timeline" data-stats-key="${esc(key)}" data-granularity="${granularity}" ${!clickable&&state.detail?`data-stats-entity="${esc(state.detail.id)}" data-stats-kind="${state.detail.kind}"`:''} aria-label="${esc(title)}"><span class="chart-bar-area"><span class="chart-bar" style="height:${row.ms/max*100}%"></span></span><span>${esc(periodLabel(key,granularity))}</span></${clickable?'button':'div'}>`;
    }).join('')}</div></div><div class="chart-meta"><span>${t(clickable?'Select a bar to explore that period.':'Listening time by month.')}</span><span>${t('Peak')}: ${shortTime(max)}</span></div>`;
  }
  function rankList(items,kind,limit=7) {
    if (!items?.length) return empty();
    const max = Math.max(...items.slice(0,limit).map(row=>row.ms));
    return `<div class="rank-list">${items.slice(0,limit).map((entity,index)=>entityButton(entity,kind,`<span class="rank-number">${String(index+1).padStart(2,'0')}</span><span class="rank-main"><strong>${esc(entity.name)}</strong><small>${esc(entity.artist || `${num(entity.streams)} ${t('plays')}`)}</small><span class="progress-track"><span class="progress-fill" style="width:${max?entity.ms/max*100:0}%"></span></span></span><span class="rank-value">${shortTime(entity.ms)}</span>`,'rank-item')).join('')}</div>`;
  }
  function discovery(items) {
    if (!items?.length) return empty('No forgotten favourites found.');
    return `<div class="discovery-list">${items.slice(0,7).map(entity=>entityButton(entity,entity.kind==='artist'?'artists':'songs',`<span class="discovery-symbol" aria-hidden="true">♫</span><span><strong>${esc(entity.name)}</strong><small>${entity.artist?`${esc(entity.artist)} · `:''}${t('Last heard')} ${date(entity.lastStream)}</small></span><span>${t(entity.kind==='artist'?artistName():songName())} ↗</span>`,'discovery-item')).join('')}</div>`;
  }
  function calendar(year) {
    const data = state.result.daily || [];
    if (!state.result.coverage?.start) return empty();
    const currentYear = Number(year || state.result.dateRange.end?.slice(0,4) || new Date().getFullYear());
    const lookupDays = new Map(data.map(row=>[row.date,row]));
    const inYear = data.filter(row=>Number(row.date.slice(0,4))===currentYear);
    const max = Math.max(0,...inYear.map(row=>row.ms));
    const first = new Date(currentYear,0,1,12), last = new Date(currentYear+1,0,1,12);
    let cells = ''.padStart((first.getDay()+6)%7,' ').split('').map(()=>'<span class="calendar-pad"></span>').join('');
    for (const day = new Date(first);day < last;day.setDate(day.getDate()+1)) {
      const key=localDateKey(day),row=lookupDays.get(key),ms=row?.ms||0;
      const level=ms && max?Math.max(1,Math.ceil(ms/max*4)):0;
      const title=`${date(key)} · ${duration(ms)} · ${num(row?.streams)} ${t('plays')}`;
      cells+=`<button type="button" class="calendar-day level-${level}" data-day="${key}" data-stats="day" data-stats-key="${key}" aria-label="${esc(title)}"></button>`;
    }
    const months = Array.from({length:12},(_,month)=>new Date(currentYear,month,1).toLocaleDateString(i18n.locale,{month:'short'}));
    const weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    return `<div class="calendar-scroll"><div class="calendar-wrap"><div class="calendar-months">${months.map(month=>`<span>${esc(month)}</span>`).join('')}</div><div class="calendar-layout"><div class="calendar-labels">${weekdays.map(day=>`<span>${t(day)}</span>`).join('')}</div><div class="calendar-grid">${cells}</div></div></div></div>${legend()}<p class="panel-note">${t('Select a day to filter your history. Empty cells mean no plays in the selected range.')}</p>`;
  }
  function calendarSelect() {
    const start=Number(state.result.coverage?.start?.slice(0,4)),end=Number(state.result.coverage?.end?.slice(0,4));
    const years=[];
    if (Number.isFinite(start)&&Number.isFinite(end)) for(let year=end;year>=start;year--) years.push(year);
    state.calendarYear ||= end || new Date().getFullYear();
    return `<label class="sr-only" for="calendar-year">${t('Calendar year')}</label><select id="calendar-year">${years.map(year=>`<option value="${year}" ${year===state.calendarYear?'selected':''}>${year}</option>`).join('')}</select>`;
  }
  const legend=()=>`<div class="legend"><span>${t('Less')}</span>${[0,1,2,3,4].map(level=>`<i class="level-${level}" aria-hidden="true"></i>`).join('')}<span>${t('More')}</span></div>`;
  function milestones(items) {
    if(!items?.length) return empty('No milestones reached in this range.');
    return `<div class="milestone-list">${items.slice(0,6).map(item=>entityButton(item,item.kind==='artist'?'artists':'songs',`<span class="accent">${item.kind==='artist'?`${num(item.threshold)} ${t('h')}`:`${num(item.threshold)} ${t('plays')}`}</span><strong>${esc(item.name)}</strong><small>${t(item.kind==='artist'?'Artist listening milestone':'Song play milestone')} · ${date(item.reachedAt)}</small>`,'milestone')).join('')}</div>`;
  }
  function overview() {
    const result=state.result,totals=result.totals,insights=result.insights;
    const widgets={
      timeline:()=>`<section class="panel wide">${heading('Listening timeline','',`<button type="button" class="text-button" data-go="history">${t('Explore history')} →</button>`)}${chart(result.monthly)}</section>`,
      songs:()=>`<section class="panel">${heading(result.type==='podcast'?'Top episodes':'Top songs','',`<button type="button" class="text-button" data-go="songs">${t('View all')} →</button>`)}${rankList(result.library.songs,'songs')}</section>`,
      artists:()=>`<section class="panel">${heading(result.type==='podcast'?'Top shows':'Top artists','',`<button type="button" class="text-button" data-go="artists">${t('View all')} →</button>`)}${rankList(result.library.artists,'artists')}</section>`,
      forgotten:()=>`<section class="panel">${heading('Forgotten favourites','Played at least 10 times, unheard for 90 days.')}${discovery(insights.forgotten)}<p class="panel-note">${t('Measured at the end of your selected range, using only imported history.')}</p></section>`,
      calendar:()=>`<section class="panel wide">${heading('Daily listening calendar','',calendarSelect())}${calendar(state.calendarYear)}</section>`,
      milestones:()=>`<section class="panel wide">${heading('Personal milestones','Thresholds reached inside the selected range.')}${milestones(insights.milestones)}</section>`,
      habits:()=>`<section class="panel">${heading('Listening at a glance')}
      <div class="key-values"><div class="key-value"><small>${t('Favourite hour')}</small><strong>${insights.topHour==null?'—':`${String(insights.topHour).padStart(2,'0')}:00`}</strong></div><div class="key-value"><small>${t('Favourite weekday')}</small><strong>${insights.topWeekday?t(insights.topWeekday):'—'}</strong></div><div class="key-value"><small>${t('Longest listening streak')}</small><strong>${num(insights.streak?.days)} ${t('days')}</strong></div><div class="key-value"><small>${t('Top five share')}</small><strong>${pct(insights.concentration?.top5Percent)}</strong></div></div><p class="panel-note">${t('Explore Listening for shuffle, skips, offline playback and devices.')}</p></section>`
    };
    return `<div class="view-intro"><p>${t('Your selected history at a glance.')}</p><button type="button" class="button secondary" id="customize-widgets">▦ ${t('Customize')}</button></div><div class="stats-grid">${card('Listening time',shortTime(totals.ms),`${num(totals.streams)} ${t('plays')}`,true)}${card('Different tracks',num(totals.uniqueSongs),`${num(totals.uniqueArtists)} ${t(result.type==='podcast'?'shows':'artists')}`)}${card('Active days',num(totals.activeDays),`${num(totals.calendarDays)} ${t('calendar days')}`)}${card('Daily average',duration(totals.avgMsPerDay),`${t('On active days')}: ${duration(totals.avgMsPerActiveDay)}`)}</div><div class="widget-grid">${state.widgets.filter(widget=>widget.enabled).map(widget=>widgets[widget.id]()).join('')}</div>`;
  }
  function library() {
    const kind=state.view;
    const all=state.discovery==='forgotten' ? (state.result.insights.forgotten||[]).filter(entity=>entity.kind===(kind==='artists'?'artist':'song')) : state.result.library[kind]||[];
    const query=VerdeSearch.compile(state.search);
    const items=all.filter(entity=>VerdeSearch.score(entity,query)>0).slice();
    items.sort((a,b)=>state.sort==='name'?a.name.localeCompare(b.name,i18n.locale):state.sort==='streams'?b.streams-a.streams||b.ms-a.ms:b.ms-a.ms||b.streams-a.streams);
    const pages=Math.max(1,Math.ceil(items.length/20));state.page=Math.min(state.page,pages);
    const rows=items.slice((state.page-1)*20,state.page*20);
    return `<section class="panel">${heading(sectionTitle(kind), 'Complete rankings for your selected range.')}
      <div class="library-controls"><label class="sr-only" for="library-search">${t('Search this list')}</label><input type="search" id="library-search" value="${esc(state.search)}" placeholder="${t('Search this list')}" autocomplete="off"><div class="library-selects">${kind!=='albums'?`<label class="sr-only" for="discovery-filter">${t('List contents')}</label><select id="discovery-filter"><option value="all" ${state.discovery==='all'?'selected':''}>${t('All entries')}</option><option value="forgotten" ${state.discovery==='forgotten'?'selected':''}>${t('Forgotten favourites')}</option></select>`:''}<label class="sr-only" for="library-sort">${t('Sort by')}</label><select id="library-sort"><option value="ms" ${state.sort==='ms'?'selected':''}>${t('Most listening time')}</option><option value="streams" ${state.sort==='streams'?'selected':''}>${t('Most plays')}</option><option value="name" ${state.sort==='name'?'selected':''}>${t('Name A–Z')}</option></select></div></div>
      ${rows.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>${t('Rank')}</th><th>${t(kind==='songs'?'Track':kind==='artists'?'Artist':'Album')}</th><th>${t('Listening time')}</th><th>${t('Plays')}</th></tr></thead><tbody>${rows.map((entity,index)=>`<tr><td class="number">${num((state.page-1)*20+index+1)}</td><td class="entity-cell">${entityButton(entity,kind,`<strong>${esc(entity.name)}</strong>${entity.artist?`<small>${esc(entity.artist)}</small>`:''}`,'entity-button')}${badges(entity)?`<div class="entity-badges">${badges(entity)}</div>`:''}</td><td class="number">${shortTime(entity.ms)}</td><td class="number">${num(entity.streams)}</td></tr>`).join('')}</tbody></table></div>`:empty('No matches found.')}
      ${pagination(state.page,pages,items.length,'library')}<p class="sort-note">${t(state.discovery==='forgotten'?'Forgotten favourites show historical totals up to the end of your selected range.':'Search ignores punctuation and accents; words can be in any order.')}</p>${kind==='albums'?`<p class="panel-note">${t('Album details include only tracks present in your files, not a complete album tracklist.')}</p>`:''}</section>`;
  }
  function pagination(page,pages,count,type) {
    return `<div class="pagination"><span>${num(count)} ${t('results')} · ${t('Page')} ${num(page)} / ${num(pages)}</span><div><button type="button" class="button secondary" data-page="${type}" data-step="-1" ${page<=1?'disabled':''}>← ${t('Previous')}</button><button type="button" class="button secondary" data-page="${type}" data-step="1" ${page>=pages?'disabled':''}>${t('Next')} →</button></div></div>`;
  }
  function history() {
    const result=state.result,insights=result.insights,streak=insights.streak;
    const records=insights.records||{};
    const sessions=insights.sessions||[],pages=Math.max(1,Math.ceil(sessions.length/15));state.sessionPage=Math.min(pages,state.sessionPage);
    const daily=result.daily||[],varietyPeak=Math.max(0,...daily.map(day=>day.uniqueSongs));
    const variety=(result[state.granularity]||[]).filter(row=>row.uniqueSongs != null);
    return `<div class="content-grid">
      <section class="panel wide">${heading('Listening timeline','',`<div class="segmented" role="group" aria-label="${t('Chart period')}">${['daily','weekly','monthly','yearly'].map(key=>`<button type="button" data-granularity-switch="${key}" class="${key===state.granularity?'active':''}">${t({daily:'Day',weekly:'Week',monthly:'Month',yearly:'Year'}[key])}</button>`).join('')}</div>`)}${chart(result[state.granularity],state.granularity)}</section>
      <section class="panel wide">${heading('Daily listening calendar','',calendarSelect())}${calendar(state.calendarYear)}</section>
      <section class="panel">${heading('Listening records')}<div class="info-line"><span class="info-icon" aria-hidden="true">◷</span><div><div class="record-name">${t('Most listening in a day')}</div><p>${records.timeDay?`${date(records.timeDay.date)} · ${duration(records.timeDay.ms)}`:'—'}</p></div></div><div class="info-line"><span class="info-icon" aria-hidden="true">♫</span><div><div class="record-name">${t('Most varied day')}</div><p>${records.varietyDay?`${date(records.varietyDay.date)} · ${num(records.varietyDay.uniqueSongs)} ${t('different tracks')}`:'—'}</p></div></div><div class="info-line"><span class="info-icon" aria-hidden="true">▥</span><div><div class="record-name">${t('Longest listening streak')}</div><p>${num(streak?.days)} ${t('days')}${streak?.start?` · ${date(streak.start)} – ${date(streak.end)}`:''}</p></div></div></section>
      <section class="panel">${heading('Your listening variety','Different tracks and artists by period.')}<div class="key-values"><div class="key-value"><small>${t('Different tracks')}</small><strong>${num(result.totals.uniqueSongs)}</strong></div><div class="key-value"><small>${t('Different artists')}</small><strong>${num(result.totals.uniqueArtists)}</strong></div><div class="key-value"><small>${t('Most tracks in one day')}</small><strong>${num(varietyPeak)}</strong></div><div class="key-value"><small>${t('Active-day average')}</small><strong>${duration(result.totals.avgMsPerActiveDay)}</strong></div></div><div class="detail-section"><div class="table-scroll"><table class="data-table"><thead><tr><th>${t('Period')}</th><th>${t('Tracks')}</th><th>${t('Artists')}</th></tr></thead><tbody>${variety.slice(-8).map(row=>`<tr><td>${esc(periodLabel(String(row.date||row.week||row.month||row.year),state.granularity))}</td><td class="number">${num(row.uniqueSongs)}</td><td class="number">${num(row.uniqueArtists)}</td></tr>`).join('')}</tbody></table></div></div></section>
      <section class="panel wide">${heading('Listening sessions','Grouped by pauses between reconstructed plays.',`<label class="session-setting">${t('Pause threshold')}<input id="session-gap" type="number" value="${state.gap}" min="1" max="240">${t('min')}<button type="button" class="button secondary" id="apply-gap">${t('Apply')}</button></label>`)}${sessions.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>${t('Started')}</th><th>${t('Ended')}</th><th>${t('Listening time')}</th><th>${t('Plays')}</th></tr></thead><tbody>${sessions.slice((state.sessionPage-1)*15,state.sessionPage*15).map(session=>`<tr><td>${dateTime(session.start)}</td><td>${dateTime(session.end)}</td><td class="number">${duration(session.ms)}</td><td class="number">${num(session.streams)}</td></tr>`).join('')}</tbody></table></div>${pagination(state.sessionPage,pages,sessions.length,'sessions')}`:empty()}<p class="panel-note">${t('Sessions are an estimate using stream end times and played milliseconds. Simultaneous plays are kept; this does not prove uninterrupted listening.')}</p></section>
      <section class="panel wide">${heading('On repeat','Songs repeated within a day or week.')}${repeatTable(insights.repeats)}</section>
    </div>`;
  }
  function repeatTable(items) {
    if(!items?.length)return empty('No repeat phases found.');
    return `<div class="table-scroll"><table class="data-table"><thead><tr><th>${t('Track')}</th><th>${t('Period')}</th><th>${t('Plays')}</th><th>${t('Listening time')}</th></tr></thead><tbody>${items.slice(0,20).map(item=>`<tr><td class="entity-cell">${entityButton(item,'songs',`<strong>${esc(item.name)}</strong><small>${esc(item.artist)}</small>`,'entity-button')}</td><td class="number">${date(item.date)} · ${t(item.period==='week'?'Week':'Day')}</td><td class="number">${num(item.streams)}</td><td class="number">${duration(item.ms)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function bars(items,labelFn,limit=20) {
    if(!items?.length || !items.some(item=>item.ms>0))return empty();
    const max=Math.max(...items.map(item=>item.ms));
    return `<div class="bars">${items.slice(0,limit).map(item=>`<div class="bar-row"><span class="bar-label" title="${esc(labelFn(item))}">${esc(labelFn(item))}</span><span class="progress-track"><span class="progress-fill" style="width:${item.ms/max*100}%"></span></span><span class="bar-value">${shortTime(item.ms)}</span></div>`).join('')}</div>`;
  }
  function heatmap() {
    const matrix=state.result.heatmap||[],max=Math.max(0,...matrix.flat());
    const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    let cells=`<span class="heatmap-label">${t('Day / hour')}</span>`+Array.from({length:24},(_,hour)=>`<span class="heatmap-label">${String(hour).padStart(2,'0')}</span>`).join('');
    [1,2,3,4,5,6,0].forEach(day=>{
      cells+=`<span class="heatmap-label" aria-label="${t(days[day])}">${t(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day])}</span>`;
      for(let hour=0;hour<24;hour++){
        const ms=matrix[day]?.[hour]||0,level=ms&&max?Math.max(1,Math.ceil(ms/max*4)):0;
        const title=`${t(days[day])} ${String(hour).padStart(2,'0')}:00 · ${duration(ms)} · ${num(state.result.heatmapDetails?.[day]?.[hour]?.streams)} ${t('plays')}`;
        cells+=`<button type="button" class="heatmap-cell level-${level}" data-stats="heatmap" data-stats-day="${day}" data-stats-hour="${hour}" aria-label="${esc(title)}"></button>`;
      }
    });
    return `<div class="heatmap-scroll"><div class="heatmap">${cells}</div></div>${legend()}<p class="panel-note">${t('Listening time grouped by the recorded stream-end weekday and hour in your browser’s timezone.')}</p>`;
  }
  function knownMetric(label,count,known,total) {
    return `<div class="metric-block"><div class="stat-label">${t(label)}</div><div class="stat-value">${known?pct(count/known*100):'—'}</div><p class="stat-note">${num(count)} / ${num(known)} ${t('plays with a known value')} · ${num(Math.max(0,total-known))} ${t('unknown')}</p></div>`;
  }
  function countryName(name) {
    try{return name && name.length===2?new Intl.DisplayNames([i18n.locale],{type:'region'}).of(name.toUpperCase()):t(name||'unknown');}catch{return t(name||'unknown');}
  }
  function listening() {
    const result=state.result,totals=result.totals,insights=result.insights;
    return `<div class="content-grid"><section class="panel wide">${heading('Your weekly rhythm','When you listen, across the entire selected range.')}${heatmap()}</section>
      <section class="panel wide">${heading('Playback habits','Percentages use only plays with a known value.')}<div class="metric-detail-grid">${knownMetric('Skipped',totals.skipped,totals.skipKnown,totals.streams)}${knownMetric('Shuffle',totals.shuffle,totals.shuffleKnown,totals.streams)}${knownMetric('Offline',totals.offline,totals.offlineKnown,totals.streams)}</div></section>
      <section class="panel">${heading('Favourite weekdays')}${bars((result.weekdays||[]).map((ms,index)=>({ms,name:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][index]})),row=>t(row.name))}</section>
      <section class="panel">${heading('Listening by hour')}${bars((result.hours||[]).map((ms,index)=>({ms,name:`${String(index).padStart(2,'0')}:00`})),row=>row.name,24)}</section>
      <section class="panel">${heading('Devices and platforms')}${bars(insights.platforms,row=>t(row.name))}<p class="panel-note">${t('Platforms are grouped from the device labels in your export.')}</p></section>
      <section class="panel">${heading('Countries')}${bars(insights.countries,row=>countryName(row.name))}<p class="panel-note">${t('Country codes describe the export’s connection country. They do not identify precise locations or journeys.')}</p></section>
      <section class="panel">${heading('How much you favour your favourites')}<div class="key-values"><div class="key-value"><small>${t('Top five tracks')}</small><strong>${pct(insights.concentration?.top5Percent)}</strong></div><div class="key-value"><small>${t('Top ten tracks')}</small><strong>${pct(insights.concentration?.top10Percent)}</strong></div></div><p class="panel-note">${t('Share of total listening time spent on your most-played tracks by time.')}</p></section>
      <section class="panel">${heading('Most skipped tracks','Tracks with at least one known skip.')}${skipList(insights.skipSongs)}<p class="panel-note">${t('A skip comes from Spotify’s recorded skipped flag. Missing flags are counted as unknown.')}</p></section></div>`;
  }
  function skipList(items) {
    if(!items?.length)return empty('No known skipped tracks in this range.');
    return `<div class="rank-list">${items.slice(0,8).map((item,index)=>entityButton(item,'songs',`<span class="rank-number">${index+1}</span><span class="rank-main"><strong>${esc(item.name)}</strong><small>${esc(item.artist)}</small></span><span class="rank-value">${pct(item.skipKnown?item.skipCount/item.skipKnown*100:0)}<small class="dim"> (${num(item.skipCount)}/${num(item.skipKnown)})</small></span>`,'rank-item')).join('')}</div>`;
  }
  function dataView() {
    const result=state.result;
    return `<section class="panel data-summary">${heading('This browser session','No server upload. No saved listening archive.')}<div class="key-values"><div class="key-value"><small>${t('History files')}</small><strong>${num(result.fileCount)}</strong></div><div class="key-value"><small>${t('Imported coverage')}</small><strong>${date(result.coverage?.start)} – ${date(result.coverage?.end)}</strong></div><div class="key-value"><small>${t('Current content filter')}</small><strong>${t(result.type==='music'?'Music':result.type==='podcast'?'Podcasts':'Music + podcasts')}</strong></div><div class="key-value"><small>${t('Timezone')}</small><strong>${esc(result.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)}</strong></div></div><div class="info-line"><span class="info-icon" aria-hidden="true">◇</span><p>${t('Your history is processed only in this browser. It is not sent to VerdeStats, Spotify or another service.')}</p></div><div class="info-line"><span class="info-icon" aria-hidden="true">↻</span><p>${t('Your data stays in memory while this page is open. Refreshing, closing the page or discarding data resets the analysis.')}</p></div><div class="info-line"><span class="info-icon" aria-hidden="true">▦</span><p>${t('Only your chosen language is remembered in this browser. Widget layouts are temporary, and listening data is never saved in browser storage.')}</p></div><div class="info-line"><span class="info-icon" aria-hidden="true">♫</span><p>${t('Milestones refer only to your imported files. They do not describe your complete lifetime if the export is incomplete.')}</p></div><button type="button" class="button secondary" data-discard>${t('Discard data and choose new files')}</button></section>`;
  }
  function render() {
    if(!state.result)return;
    hideStats();
    $('view-title').textContent=t(sectionTitle(state.view));$('view-title').dataset.i18n=sectionTitle(state.view);
    document.querySelectorAll('.app-nav [data-view]').forEach(button=>{
      const active=button.dataset.view===state.view;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');
      const label=button.querySelector('[data-i18n]');label.textContent=t(sectionTitle(button.dataset.view));label.dataset.i18n=sectionTitle(button.dataset.view);
    });
    content.innerHTML=state.view==='overview'?overview():['songs','artists','albums'].includes(state.view)?library():state.view==='history'?history():state.view==='listening'?listening():dataView();
    const range=state.result.dateRange;
    $('range-summary').textContent=`${date(range.start)} – ${date(range.end)} · ${num(state.result.totals.streams)} ${t('plays')}`;
    const timezone=state.result.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
    $('timezone-note').textContent=`${t('Timezone')}: ${timezone}`;
    $('timezone-caption').textContent=`${t('End date included')} · ${timezone}`;
  }
  function navigate(view) {
    state.view=view;state.page=1;state.search='';state.discovery='all';render();
    $('global-search').value='';$('search-results').hidden=true;
  }
  function relatedTracks(items) {
    const pages=Math.max(1,Math.ceil(items.length/20));state.detailPage=Math.min(state.detailPage,pages);
    return rankList(items.slice((state.detailPage-1)*20,state.detailPage*20),'songs',20)+(pages>1?pagination(state.detailPage,pages,items.length,'related'):'');
  }
  function openEntity(id,kind) {
    const entity=lookup(id,kind);
    if(!entity)return;
    if(!state.detail||state.detail.id!==id||state.detail.kind!==kind)state.detailPage=1;state.detail={id,kind};
    const result=state.result;
    const inSelection=!!result.library[kind].find(item=>item.id===entity.id);
    $('detail-kind').textContent=t(kind==='songs'?(entity.type==='podcast'?'Episode':'Song'):kind==='artists'?(entity.type==='podcast'?'Show':'Artist'):'Album');
    const songs=kind==='songs'?[]:result.library.songs.filter(song=>kind==='artists'?(entity.songIds?.includes(song.id)||song.artistId===entity.id):(entity.songIds?.includes(song.id)||song.albumId===entity.id));
    const albums=kind==='artists'?result.library.albums.filter(album=>entity.albumIds?.includes(album.id)||album.artistId===entity.id):[];
    const artist=kind==='songs'?lookup(entity.artistId,'artists'):null,album=kind==='songs'?lookup(entity.albumId,'albums'):null;
    const entityMilestones=(result.insights.milestones||[]).filter(item=>item.id===entity.id);
    $('detail-content').innerHTML=`<h2>${esc(entity.name)}</h2><p class="detail-subtitle">${esc(entity.artist||t(kind==='artists'?'Artist profile':'Listening details'))}</p>${badges(entity)?`<div class="entity-badges">${badges(entity)}</div>`:''}<div class="stats-grid">${card('Listening time',duration(entity.ms))}${card('Plays',num(entity.streams))}${card('Listening-time rank',entity.rank?`#${num(entity.rank)}`:'—')}</div><div class="key-values"><div class="key-value"><small>${t('First listen')}</small><strong>${date(entity.firstStream)}</strong></div><div class="key-value"><small>${t('Latest listen')}</small><strong>${date(entity.lastStream)}</strong></div></div><p class="detail-context">${t(inSelection?'Listening time and plays follow your active filters. First and last appearances come from your imported history.':'These totals cover imported history up to the selected end date; this favourite has no recent plays.')}</p><div class="detail-section key-values"><div class="key-value"><small>${t('Active months')}</small><strong>${num(entity.monthly?.filter(month=>month.ms>0).length)}</strong></div>${inSelection?`<div class="key-value"><small>${t('Share of listening time')}</small><strong>${pct(result.totals.ms?entity.ms/result.totals.ms*100:0)}</strong></div>`:''}</div>${artist||album?`<div class="detail-links">${artist?entityButton(artist,'artists',`${t('Artist')}: ${esc(artist.name)} ↗`,'button secondary'):''}${album?entityButton(album,'albums',`${t('Album')}: ${esc(album.name)} ↗`,'button secondary'):''}</div>`:''}<section class="detail-section"><h3>${t('Listening timeline')}</h3>${chart(entity.monthly,'monthly',false)}</section>${kind!=='songs'?`<section class="detail-section"><h3>${t(kind==='albums'?'Heard tracks':'Favourite tracks')} · ${num(songs.length)}</h3>${relatedTracks(songs.sort((a,b)=>b.ms-a.ms))}${kind==='albums'?`<p class="panel-note">${t('These are only the tracks heard in this range. The export cannot tell us the full album tracklist or unplayed tracks.')}</p>`:''}</section>`:''}${albums.length?`<section class="detail-section"><h3>${t('Albums')} · ${num(albums.length)}</h3>${rankList(albums.sort((a,b)=>b.ms-a.ms),'albums',albums.length)}</section>`:''}${entityMilestones.length?`<section class="detail-section"><h3>${t('Personal milestones')}</h3>${milestones(entityMilestones)}</section>`:''}${entity.skipKnown?`<p class="panel-note">${t('Skip rate')}: ${pct(entity.skipCount/entity.skipKnown*100)} · ${num(entity.skipCount)} / ${num(entity.skipKnown)} ${t('known plays')}</p>`:''}`;
    const dialog=$('detail-dialog');if(!dialog.open)dialog.showModal();dialog.setAttribute('aria-label',`${t('Listening details')}: ${entity.name}`);
  }
  function widgetSettings() {
    $('widget-settings').innerHTML=state.widgets.map((widget,index)=>`<div class="widget-setting"><label><input type="checkbox" data-widget="${widget.id}" ${widget.enabled?'checked':''}>${t(widgetNames[widget.id])}</label><div><button type="button" class="icon-button" data-widget-move="${widget.id}" data-direction="-1" ${index===0?'disabled':''} aria-label="${t('Move up')}">↑</button><button type="button" class="icon-button" data-widget-move="${widget.id}" data-direction="1" ${index===state.widgets.length-1?'disabled':''} aria-label="${t('Move down')}">↓</button></div></div>`).join('');
  }
  function searchGlobal() {
    const input=$('global-search').value,box=$('search-results');
    if(!VerdeSearch.normalize(input)||!state.result){box.hidden=true;box.innerHTML='';return;}
    const query=VerdeSearch.compile(input);
    let truncated=false;
    box.innerHTML=['songs','artists','albums'].map(kind=>{
      const items=state.result.library[kind].map(entity=>({entity,score:VerdeSearch.score(entity,query)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||b.entity.ms-a.entity.ms).map(item=>item.entity);if(items.length>5)truncated=true;
      return items.length?`<div class="search-heading">${t(sectionTitle(kind))} · ${num(items.length)}</div>${items.slice(0,5).map(entity=>entityButton(entity,kind,`<span><strong>${esc(entity.name)}</strong><small>${esc(entity.artist||'')}</small></span><span>${shortTime(entity.ms)} ↗</span>`,'search-result')).join('')}`:'';
    }).join('')||`<p class="empty center">${t('No matches found.')}</p>`;
    if(truncated)box.innerHTML+=`<p class="panel-note">${t('Open a library page to search the complete list.')}</p>`;
    box.hidden=false;
  }
  function setProgress(progress,stage,importing) {
    const prefix=importing?'upload':'job';
    $(`${prefix}-progress`).hidden=false;
    const value=Math.max(0,Math.min(100,Number(progress)||0));
    $(`${prefix}-bar`).value=value;$(`${prefix}-percent`).textContent=`${Math.round(value)}%`;$(`${prefix}-stage`).textContent=t(stage||'Analyzing your history…');
  }
  function worker() {
    if(state.worker)return state.worker;
    state.worker=new Worker('/worker.js');
    state.worker.onmessage=event=>{
      const message=event.data;if(message.id!==state.pending)return;
      const importing=!state.result;
      if(message.type==='progress'){setProgress(message.progress,message.stage,importing);return;}
      if(message.type==='error'){fail(message.error||'Analysis failed',importing);return;}
      if(message.type==='result'){
        state.result=message.result;state.busy=false;state.page=1;state.sessionPage=1;
        $('landing').hidden=true;$('app').hidden=false;
        $('upload-progress').hidden=true;$('job-progress').hidden=true;
        $('upload-status').textContent='';$('app-status').textContent='';$('app-status').className='status';
        $('upload-btn').disabled=false;$('analyze-btn').disabled=false;
        if(importing){setDefaultDates();state.view='overview';state.calendarYear=null;}
        render();searchGlobal();if(!document.activeElement.closest('.global-search'))$('search-results').hidden=true;
        if(state.detail&&$('detail-dialog').open){if(lookup(state.detail.id,state.detail.kind))openEntity(state.detail.id,state.detail.kind);else{$('detail-dialog').close();$('detail-content').replaceChildren();state.detail=null;}}
        if(importing){window.scrollTo(0,0);$('view-title').setAttribute('tabindex','-1');$('view-title').focus();}
      }
    };
    state.worker.onerror=()=>fail('Your browser could not run the analysis. Try refreshing this page.',!state.result);
    return state.worker;
  }
  function fail(message,importing) {
    state.busy=false;
    const status=$(importing?'upload-status':'app-status');status.className='status error';status.textContent=t(message);
    $('upload-btn').disabled=!state.files.length;$('analyze-btn').disabled=false;
    $('upload-progress').hidden=true;$('job-progress').hidden=true;
  }
  function startImport(event) {
    event.preventDefault();if(state.busy||!state.files.length)return;
    $('upload-status').textContent='';state.busy=true;state.pending=++state.request;$('upload-btn').disabled=true;
    try{worker().postMessage({id:state.pending,type:'import',files:state.files});setProgress(0,'Reading your files…',true);}catch{fail('Your browser could not run the analysis. Try refreshing this page.',true);}
  }
  function analyze() {
    if(state.busy||!state.result)return;
    if(!$('filter-form').reportValidity())return;
    if($('start-date').value>$('end-date').value){fail('Start date must be on or before end date.',false);return;}
    state.busy=true;state.pending=++state.request;$('analyze-btn').disabled=true;$('app-status').textContent='';
    $('search-results').hidden=true;$('search-results').replaceChildren();
    worker().postMessage({id:state.pending,type:'analyze',options:{startDate:$('start-date').value,endDate:$('end-date').value,minMs:Number($('min-seconds').value)*1000,type:$('content-type').value,sessionGapMinutes:state.gap}});
    setProgress(0,'Analyzing your history…',false);
  }
  function setDefaultDates() {
    const coverage=state.result.coverage;
    $('start-date').value=coverage.start?.slice(0,10)||'';$('end-date').value=coverage.end?.slice(0,10)||'';
    const start=Number(coverage.start?.slice(0,4)),end=Number(coverage.end?.slice(0,4)),years=[];
    if(Number.isFinite(start)&&Number.isFinite(end))for(let year=end;year>=start;year--)years.push(year);
    $('period-year').innerHTML=years.map(year=>`<option value="${year}">${year}</option>`).join('');$('period-month').value=coverage.end?.slice(0,7)||'';$('period').value='all';$('content-type').value='music';$('min-seconds').value=0;showPreset();
  }
  function showPreset() {
    $('year-field').hidden=$('period').value!=='year';$('month-field').hidden=$('period').value!=='month';
  }
  function applyPreset() {
    const period=$('period').value;showPreset();if(!state.result)return;
    if(period==='all'){$('start-date').value=state.result.coverage.start.slice(0,10);$('end-date').value=state.result.coverage.end.slice(0,10);}
    if(period==='year'){$('start-date').value=`${$('period-year').value}-01-01`;$('end-date').value=`${$('period-year').value}-12-31`;}
    if(period==='month'&&$('period-month').value){const key=$('period-month').value;const [year,month]=key.split('-').map(Number);$('start-date').value=`${key}-01`;$('end-date').value=localDateKey(new Date(year,month,0,12));}
  }
  function filterPeriod(key,granularity) {
    if(state.busy)return;
    let start,end;
    if(granularity==='yearly'){start=`${key}-01-01`;end=`${key}-12-31`;}
    else if(granularity==='monthly'){const [year,month]=key.split('-').map(Number);start=`${key}-01`;end=localDateKey(new Date(year,month,0,12));}
    else if(granularity==='weekly'){start=key;const day=new Date(`${key}T12:00:00`);day.setDate(day.getDate()+6);end=localDateKey(day);}
    else{start=key;end=key;}
    $('period').value='custom';showPreset();$('start-date').value=start;$('end-date').value=end;analyze();
  }
  function updateFiles(files) {
    if(state.busy)return;state.files=Array.from(files);$('upload-btn').disabled=!state.files.length;
    $('file-list').innerHTML=state.files.map(file=>`<div class="file-row"><span>${esc(file.name)}</span><span>${(file.size/1024/1024).toLocaleString(i18n.locale,{maximumFractionDigits:2})} MB</span></div>`).join('');
    $('upload-status').textContent='';
  }
  function discard(showLanding=true) {
    hideStats();
    clearTimeout(globalSearchTimer);
    state.worker?.terminate();state.worker=null;state.result=null;state.pending=++state.request;state.busy=false;state.files=[];state.detail=null;state.search='';state.view='overview';state.page=1;state.sessionPage=1;state.calendarYear=null;
    $('detail-dialog').close();$('widgets-dialog').close();$('detail-content').replaceChildren();$('search-results').replaceChildren();$('search-results').hidden=true;$('global-search').value='';content.replaceChildren();$('file-input').value='';$('file-list').replaceChildren();$('upload-status').textContent='';$('app-status').textContent='';$('range-summary').textContent='';$('filter-form').reset();$('period-year').replaceChildren();$('timezone-note').textContent='';$('timezone-caption').textContent='';$('upload-progress').hidden=true;$('job-progress').hidden=true;$('upload-btn').disabled=true;$('analyze-btn').disabled=false;
    if(showLanding){$('app').hidden=true;$('landing').hidden=false;window.scrollTo(0,0);$('drop-zone').focus();}
  }
  document.addEventListener('click',event=>{
    const visual=event.target.closest('[data-stats]');
    const touch=event.pointerType==='touch'||(event.detail>0&&statsPointerType==='touch');
    if(visual&&(visual.dataset.stats==='heatmap'||visual.dataset.statsEntity)){
      if(statsTarget===visual&&statsPinned)hideStats();else{showStats(visual);statsPinned=true;}return;
    }
    if(visual&&touch){
      if(statsTarget!==visual||!statsPinned){showStats(visual);statsPinned=true;return;}
      hideStats();
    }
    if(!event.target.closest('[data-stats]'))hideStats();
    const target=event.target.closest('button,[data-go]');
    if(!target)return;
    if(target.dataset.discard!==undefined){discard();return;}
    if(target.dataset.view){navigate(target.dataset.view);return;}
    if(target.dataset.go){navigate(target.dataset.go);return;}
    if(target.dataset.entity){openEntity(target.dataset.entity,target.dataset.kind);$('search-results').hidden=true;return;}
    if(target.dataset.close){$(target.dataset.close).close();return;}
    if(target.dataset.period){filterPeriod(target.dataset.period,target.dataset.granularity);return;}
    if(target.dataset.day){filterPeriod(target.dataset.day,'daily');return;}
    if(target.dataset.page){if(target.dataset.page==='related'){state.detailPage+=Number(target.dataset.step);openEntity(state.detail.id,state.detail.kind);return;}if(target.dataset.page==='library')state.page+=Number(target.dataset.step);else state.sessionPage+=Number(target.dataset.step);render();return;}
    if(target.dataset.granularitySwitch){state.granularity=target.dataset.granularitySwitch;render();return;}
    if(target.id==='customize-widgets'){widgetSettings();$('widgets-dialog').showModal();return;}
    if(target.id==='widgets-done'){$('widgets-dialog').close();render();return;}
    if(target.dataset.widgetMove){const index=state.widgets.findIndex(widget=>widget.id===target.dataset.widgetMove),other=index+Number(target.dataset.direction);[state.widgets[index],state.widgets[other]]=[state.widgets[other],state.widgets[index]];widgetSettings();render();return;}
    if(target.id==='apply-gap'){const input=$('session-gap');if(!input.reportValidity())return;state.gap=Number(input.value);analyze();}
  });
  document.addEventListener('change',event=>{
    if(event.target.dataset.widget){state.widgets.find(widget=>widget.id===event.target.dataset.widget).enabled=event.target.checked;render();}
    if(event.target.id==='calendar-year'){state.calendarYear=Number(event.target.value);render();}
    if(event.target.id==='library-sort'){state.sort=event.target.value;state.page=1;render();}
    if(event.target.id==='discovery-filter'){state.discovery=event.target.value;state.page=1;render();}
  });
  function updateLibrarySearch(event) {
    if(event.target.id==='library-search'&&!event.isComposing&&state.search!==event.target.value){
      const cursor=event.target.selectionStart;state.search=event.target.value;state.page=1;render();$('library-search').focus();$('library-search').setSelectionRange(cursor,cursor);
    }
  }
  document.addEventListener('input',updateLibrarySearch);
  document.addEventListener('compositionend',updateLibrarySearch);
  let globalSearchTimer=null;
  $('global-search').addEventListener('input',event=>{clearTimeout(globalSearchTimer);if(event.isComposing)return;if(!VerdeSearch.normalize(event.target.value))searchGlobal();else globalSearchTimer=setTimeout(()=>{if(document.activeElement===$('global-search'))searchGlobal();},120);});
  $('global-search').addEventListener('compositionend',searchGlobal);
  $('global-search').addEventListener('focus',searchGlobal);
  $('global-search').addEventListener('keydown',event=>{
    if(event.isComposing||event.keyCode===229)return;
    if(event.key==='Escape'){clearTimeout(globalSearchTimer);$('search-results').hidden=true;}
    if(['ArrowDown','Enter'].includes(event.key)){clearTimeout(globalSearchTimer);searchGlobal();}
    if(['ArrowDown','Enter'].includes(event.key)&&!$('search-results').hidden){const first=$('search-results').querySelector('button');if(first){event.preventDefault();if(event.key==='Enter')first.click();else first.focus();}}
  });
  $('search-results').addEventListener('keydown',event=>{
    const items=Array.from($('search-results').querySelectorAll('button')),index=items.indexOf(event.target);
    if(event.key==='Escape'){event.preventDefault();$('global-search').focus();$('search-results').hidden=true;}
    if(['ArrowDown','ArrowUp'].includes(event.key)&&items.length){event.preventDefault();if(event.key==='ArrowUp'&&index===0)$('global-search').focus();else items[(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();}
  });
  function scheduleStatsHide() {
    if(statsPinned||!statsTarget||document.activeElement===statsTarget)return;
    clearTimeout(statsHideTimer);statsHideTimer=setTimeout(hideStats,140);
  }
  document.addEventListener('pointerdown',event=>{statsPointerType=event.pointerType;statsHoverSuppressed=false;});
  document.addEventListener('pointermove',event=>{
    if(statsHoverSuppressed&&(event.movementX||event.movementY)){statsHoverSuppressed=false;const target=event.target.closest('[data-stats]');if(target&&event.pointerType!=='touch')showStats(target);}
  });
  document.addEventListener('pointerover',event=>{
    if(statsTooltip.contains(event.target)){clearTimeout(statsHideTimer);statsHideTimer=null;return;}
    const target=event.target.closest('[data-stats]');
    if(target){clearTimeout(statsHideTimer);statsHideTimer=null;if(event.pointerType!=='touch'&&!statsPinned&&!statsHoverSuppressed&&statsTarget!==target)showStats(target);}
  });
  document.addEventListener('pointerout',event=>{
    if(statsTarget&&event.target.closest('[data-stats]')===statsTarget&&!statsTarget.contains(event.relatedTarget)&&!statsTooltip.contains(event.relatedTarget))scheduleStatsHide();
  });
  statsTooltip.addEventListener('pointerleave',event=>{if(!statsTarget?.contains(event.relatedTarget))scheduleStatsHide();});
  document.addEventListener('focusin',event=>{const target=event.target.closest('[data-stats]');if(target){statsHoverSuppressed=false;showStats(target);}else hideStats();});
  document.addEventListener('focusout',event=>{if(!statsPinned&&statsTarget&&event.target===statsTarget&&!statsTarget.contains(event.relatedTarget))hideStats();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){statsHoverSuppressed=true;hideStats();}});
  window.addEventListener('resize',hideStats);
  document.addEventListener('scroll',event=>{if(statsTooltip.contains(event.target))return;if(statsTarget&&document.activeElement===statsTarget&&!statsPinned)showStats(statsTarget);else hideStats();},true);
  document.addEventListener('click',event=>{if(!event.target.closest('.global-search'))$('search-results').hidden=true;});
  $('filter-form').addEventListener('submit',event=>{event.preventDefault();analyze();});
  ['period','period-year','period-month'].forEach(id=>$(id).addEventListener('change',applyPreset));
  ['start-date','end-date'].forEach(id=>$(id).addEventListener('input',()=>{$('period').value='custom';showPreset();}));
  $('upload-form').addEventListener('submit',startImport);
  $('file-input').addEventListener('change',event=>updateFiles(event.target.files));
  const drop=$('drop-zone');
  drop.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('file-input').click();}});
  drop.addEventListener('dragover',event=>{event.preventDefault();if(!state.busy)drop.classList.add('dragover');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));
  drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('dragover');updateFiles(event.dataTransfer.files);});
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}}));
  function tutorial() {if(location.hash==='#tutorial')$('tutorial').open=true;}
  window.addEventListener('hashchange',tutorial);tutorial();
  document.addEventListener('languagechange',()=>{
    $('spotify-privacy-link').href=`https://www.spotify.com/${i18n.language==='de'?'de':'en'}/account/privacy/`;render();searchGlobal();updateFiles(state.files);if(state.detail&&$('detail-dialog').open)openEntity(state.detail.id,state.detail.kind);if($('widgets-dialog').open)widgetSettings();
  });
  $('spotify-privacy-link').href=`https://www.spotify.com/${i18n.language==='de'?'de':'en'}/account/privacy/`;
  window.addEventListener('pagehide',()=>discard(false));
})();
