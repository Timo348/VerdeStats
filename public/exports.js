/* Explicit downloads assembled locally. Object URLs never enter application state. */
(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.VerdeExports=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  function csvCell(value){
    let text=String(value??'');
    // Spreadsheet applications can interpret prefixes even after whitespace.
    if(/^[\s\u0000-\u001f]*[=+@-]/u.test(text))text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }
  function csv(headers,rows){return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
  function csvTable(result,kind,t){
    if(['songs','artists','albums'].includes(kind))return csv([t('Name'),t('Artist'),t('Listening time (ms)'),t('Plays')],result.library[kind].map(r=>[r.name,r.artist||'',r.ms,r.streams]));
    const field=kind==='daily'?'date':'month';
    return csv([t('Period'),t('Listening time (ms)'),t('Plays'),t('Unique songs'),t('Unique artists')],result[kind].map(r=>[r[field],r.ms,r.streams,r.uniqueSongs,r.uniqueArtists]));
  }
  function pdfFromJpegs(pages){
    const encoder=new TextEncoder(),chunks=[],offsets=[0];let length=0;
    const add=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;chunks.push(bytes);length+=bytes.length;};
    const object=(id,content)=>{offsets[id]=length;add(`${id} 0 obj\n`);content();add('\nendobj\n');};
    add('%PDF-1.4\n');
    object(1,()=>add('<< /Type /Catalog /Pages 2 0 R >>'));
    object(2,()=>add(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`));
    pages.forEach((p,i)=>{
      const id=3+i*3;
      object(id,()=>add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /I ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`));
      object(id+1,()=>{add(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`);add(p.bytes);add('\nendstream');});
      const command='q 595 0 0 842 0 0 cm /I Do Q\n';
      object(id+2,()=>add(`<< /Length ${encoder.encode(command).length} >>\nstream\n${command}endstream`));
    });
    const xref=length;add(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
    for(const offset of offsets.slice(1))add(`${String(offset).padStart(10,'0')} 00000 n \n`);
    add(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const output=new Uint8Array(length);let cursor=0;for(const chunk of chunks){output.set(chunk,cursor);cursor+=chunk.length;}return output;
  }
  async function reportPdf(result,title,t,locale,cancelled=()=>false){
    const pages=[],canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1684;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('The PDF could not be created.');
    const time=ms=>`${(ms/3600000).toLocaleString(locale,{maximumFractionDigits:2})} ${t('h')}`;
    let y=0;
    const fit=(value,width)=>{let s=String(value);if(ctx.measureText(s).width<=width)return s;while(s.length&&ctx.measureText(s+'…').width>width)s=s.slice(0,-1);return s+'…';};
    const line=(text,right='')=>{ctx.fillStyle='#24292f';ctx.font='25px sans-serif';ctx.fillText(fit(text,850),64,y);if(right){ctx.textAlign='right';ctx.fillText(right,1126,y);ctx.textAlign='left';}y+=42;};
    const begin=()=>{ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);y=80;ctx.fillStyle='#166534';ctx.font='bold 34px sans-serif';ctx.fillText('VerdeStats · '+fit(title,900),64,y);y+=58;};
    const flush=async()=>{
      if(cancelled())throw new Error('Export cancelled.');
      ctx.fillStyle='#57606a';ctx.font='20px sans-serif';ctx.fillText(t('Based only on the files in this session.')+' · '+(pages.length+1),64,1620);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.92));if(!blob)throw new Error('The PDF could not be created.');
      pages.push({bytes:new Uint8Array(await blob.arrayBuffer()),width:canvas.width,height:canvas.height});
    };
    begin();
    const range=result.dateRange||{start:result.start,end:result.end},totals=result.totals||result;
    line(`${range.start} — ${range.end}`);line(t('Content')+': '+t({music:'Music',podcast:'Podcasts',all:'Music + podcasts'}[result.type]||'Music'));line(t('Minimum seconds')+': '+String(result.minMs/1000||0));line(t('Listening time'),time(totals.ms));line(t('Plays'),Number(totals.streams).toLocaleString(locale));
    line(t('Unique songs'),Number(totals.uniqueSongs).toLocaleString(locale));line(t('Unique artists'),Number(totals.uniqueArtists).toLocaleString(locale));
    const archive=result.coverage||result.archive;if(archive?.start)line(t('Imported archive')+': '+archive.start+' — '+archive.end);
    line(t('Archive boundaries do not prove continuous coverage.'));line(t('PDF contains up to 50 entries per ranking.'));
    const timeline=result.monthly||[];if(timeline.length){
      line(t('Listening timeline'));const recent=timeline.slice(-24),max=Math.max(1,...recent.map(r=>r.ms)),width=1040/recent.length;
      recent.forEach((r,i)=>{ctx.fillStyle='#166534';const height=r.ms/max*170;ctx.fillRect(64+i*width,y+170-height,Math.max(2,width-5),height);ctx.fillStyle='#24292f';ctx.font='16px sans-serif';ctx.save();ctx.translate(72+i*width,y+192);ctx.rotate(Math.PI/4);ctx.fillText(r.month||r.period,0,0);ctx.restore();});y+=280;line(t('Chart shows the latest 24 active months.'));}
    for(const kind of ['songs','artists','albums']){
      if(y>1400){await flush();begin();}
      line(t({songs:'Songs',artists:'Artists',albums:'Albums'}[kind]));
      const rows=result.library[kind].slice(0,50);if(!rows.length)line(t('No listening data in this range.'));
      for(let i=0;i<rows.length;i++){if(y>1500){await flush();begin();line(t({songs:'Songs',artists:'Artists',albums:'Albums'}[kind]));}const r=rows[i];line(`${i+1}. ${r.name}${r.artist?' · '+r.artist:''}`,time(r.ms));line(`   ${r.streams} ${t('plays')}`);}
    }
    await flush();canvas.width=0;canvas.height=0;
    if(cancelled())throw new Error('Export cancelled.');
    return pdfFromJpegs(pages);
  }
  function download(data,type,filename){
    const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return {csv,csvCell,csvTable,pdfFromJpegs,reportPdf,download};
});
