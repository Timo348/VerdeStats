(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VerdeAnalyzer = api;
})(typeof self === 'object' ? self : globalThis, function () {
  'use strict';
  const DAY = 86400000;
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    return { hours: Math.floor(totalSeconds / 3600), minutes: Math.floor(totalSeconds % 3600 / 60), seconds: totalSeconds % 60, totalSeconds, ms };
  }
  function durationString(ms) {
    const { hours, minutes, seconds } = formatDuration(ms);
    return [hours && `${hours}h`, minutes && `${minutes}m`, (seconds || (!hours && !minutes)) && `${seconds}s`].filter(Boolean).join(' ');
  }
  function text(value) { return typeof value === 'string' ? value.trim().normalize('NFC').slice(0, 2000) : ''; }
  // A reversible identity avoids hash collisions and separates same-name songs.
  function identifier(kind, ...parts) { return `${kind}:${JSON.stringify(parts)}`; }
  function dateKey(timestamp) {
    const date = new Date(timestamp);
    return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function dateBound(value, field = 'date') {
    if (!value) return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ${field}`);
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1900 || year > 9999) throw new Error(`Invalid ${field}`);
    const date = new Date(year, month - 1, day);
    if (dateKey(date) !== value) throw new Error(`Invalid ${field}`);
    return date.getTime();
  }
  function addDays(timestamp, days) { const date = new Date(timestamp); date.setDate(date.getDate() + days); return date.getTime(); }
  function dayNumber(timestamp) { const date = new Date(timestamp); return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY); }
  function validateOptions(options = {}) {
    const start = dateBound(options.startDate, 'start date');
    const end = dateBound(options.endDate, 'end date');
    if (start !== null && end !== null && start > end) throw new Error('Start date must be before end date');
    const minMs = options.minMs === undefined ? 0 : Number(options.minMs);
    const gap = options.sessionGapMinutes === undefined ? 30 : Number(options.sessionGapMinutes);
    const type = options.type || 'music';
    if (!Number.isFinite(minMs) || minMs < 0 || minMs > DAY) throw new Error('Invalid minimum listening time');
    if (!Number.isFinite(gap) || gap < 1 || gap > 1440) throw new Error('Invalid session gap');
    if (!['music', 'podcast', 'all'].includes(type)) throw new Error('Invalid listening type');
    return { start, end: end === null ? null : addDays(end, 1), minMs, type, gap };
  }
  function normalizePlatform(platform) {
    if (/android/i.test(platform)) return 'Android';
    if (/ios|iphone|ipad/i.test(platform)) return 'iOS';
    if (/windows|win32/i.test(platform)) return 'Windows';
    if (/osx|macos|macintosh/i.test(platform)) return 'macOS';
    if (/web_player|web player|browser|chrome|firefox/i.test(platform)) return 'Browser';
    if (/linux/i.test(platform)) return 'Linux';
    return platform || 'Unknown';
  }
  function normalizeEntry(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    let timestamp = entry.ts || entry.endTime;
    if (typeof timestamp !== 'string') return null;
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(timestamp)) timestamp = timestamp.replace(' ', 'T') + 'Z';
    const time = Date.parse(timestamp);
    const rawMs = entry.ms_played ?? entry.msPlayed;
    if (rawMs === null || rawMs === undefined || rawMs === '' || typeof rawMs === 'boolean') return null;
    const ms = Number(rawMs);
    if (!Number.isFinite(time) || new Date(time).getFullYear() < 1900 || new Date(time).getFullYear() > 9999 || !Number.isFinite(ms) || ms < 0 || ms > 7 * DAY) return null;
    const track = text(entry.master_metadata_track_name ?? entry.trackName);
    const artist = text(entry.master_metadata_album_artist_name ?? entry.artistName);
    const episode = text(entry.episode_name);
    const show = text(entry.episode_show_name);
    const trackUri = text(entry.spotify_track_uri);
    const episodeUri = text(entry.spotify_episode_uri);
    const type = track || artist || trackUri ? 'music' : episode || show || episodeUri ? 'podcast' : null;
    if (!type) return null;
    const name = type === 'music' ? track || 'Unknown track' : episode || 'Unknown episode';
    const artistName = type === 'music' ? artist || 'Unknown artist' : show || 'Unknown show';
    const album = type === 'music' ? text(entry.master_metadata_album_album_name || entry.master_metadata_album_name) || 'Unknown album' : artistName;
    const uri = type === 'music' ? trackUri : episodeUri;
    const songId = identifier(type === 'music' ? 'song' : 'episode', uri || [name, artistName]);
    const artistId = identifier(type === 'music' ? 'artist' : 'show', artistName);
    const albumId = identifier(type === 'music' ? 'album' : 'podcast', album, artistName);
    const skipped = typeof entry.skipped === 'boolean' ? entry.skipped : null;
    const shuffle = typeof entry.shuffle === 'boolean' ? entry.shuffle : null;
    const offline = typeof entry.offline === 'boolean' ? entry.offline : null;
    const platform = normalizePlatform(text(entry.platform));
    const rawCountry = text(entry.conn_country).toUpperCase();
    const country = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : 'Unknown';
    const fingerprint = identifier('event', time, ms, songId, albumId, text(entry.platform), country, skipped, shuffle, offline, text(entry.reason_start), text(entry.reason_end), typeof entry.offline_timestamp === 'number' ? entry.offline_timestamp : null, typeof entry.incognito_mode === 'boolean' ? entry.incognito_mode : null);
    // Strict allowlist: no username, IP, user-agent or arbitrary source fields.
    return { time, ms, type, name, artist: artistName, album, songId, artistId, albumId, skipped, shuffle, offline, platform, country, fingerprint };
  }
  function normalizeEntries(rawEntries) {
    const seen = new Set(), entries = [];
    for (const raw of rawEntries) {
      const entry = normalizeEntry(raw);
      if (entry && !seen.has(entry.fingerprint)) { seen.add(entry.fingerprint); entries.push(entry); }
    }
    return entries.sort((a, b) => a.time - b.time || a.fingerprint.localeCompare(b.fingerprint));
  }
  function newEntity(entry, kind) {
    const song = kind === 'songs', album = kind === 'albums';
    return { id: song ? entry.songId : album ? entry.albumId : entry.artistId, name: song ? entry.name : album ? entry.album : entry.artist, kind: song ? 'song' : album ? 'album' : 'artist', type: entry.type, ...(song || album ? { artist: entry.artist, artistId: entry.artistId } : {}), ...(song ? { album: entry.album, albumId: entry.albumId } : {}), ms: 0, streams: 0, firstStream: null, lastStream: null, skipCount: 0, skipKnown: 0, monthlyMap: new Map(), songIds: new Set(), albumIds: new Set(), times: [] };
  }
  function addEntity(map, entry, kind) {
    const id = kind === 'songs' ? entry.songId : kind === 'albums' ? entry.albumId : entry.artistId;
    if (!map.has(id)) map.set(id, newEntity(entry, kind));
    const entity = map.get(id);
    entity.ms += entry.ms; entity.streams++;
    entity.firstStream ??= new Date(entry.time).toISOString();
    entity.lastStream = new Date(entry.time).toISOString();
    entity.times.push(entry.time);
    if (entry.skipped !== null) entity.skipKnown++;
    if (entry.skipped) entity.skipCount++;
    entity.songIds.add(entry.songId); entity.albumIds.add(entry.albumId);
    const month = dateKey(entry.time).slice(0, 7);
    const monthly = entity.monthlyMap.get(month) || { month, ms: 0, streams: 0 };
    monthly.ms += entry.ms; monthly.streams++; entity.monthlyMap.set(month, monthly);
    return entity;
  }
  function mapsFor(entries) {
    const maps = { songs: new Map(), artists: new Map(), albums: new Map() };
    for (const entry of entries) for (const kind of Object.keys(maps)) addEntity(maps[kind], entry, kind);
    return maps;
  }
  function orderEntities(map) { return [...map.values()].sort((a, b) => b.ms - a.ms || b.streams - a.streams || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)); }
  function entityDTO(entity, extra = {}) {
    const { times, monthlyMap, songIds, albumIds, ...rest } = entity;
    return { ...rest, monthly: [...monthlyMap.values()], ...(entity.kind === 'artist' || entity.kind === 'album' ? { songIds: [...songIds] } : {}), ...(entity.kind === 'artist' ? { albumIds: [...albumIds] } : {}), durationString: durationString(entity.ms), ...extra };
  }
  function newBucket(labels) { return { ...labels, ms: 0, streams: 0, songCounts: new Map(), artistCounts: new Map() }; }
  function addBucketEntry(bucket, entry) {
    bucket.ms += entry.ms; bucket.streams++;
    for (const [counts, id] of [[bucket.songCounts, entry.songId], [bucket.artistCounts, entry.artistId]]) {
      const count = counts.get(id) || { ms: 0, streams: 0 };
      count.ms += entry.ms; count.streams++; counts.set(id, count);
    }
  }
  function bucketAdd(map, key, entry, field) {
    const bucket = map.get(key) || newBucket({ [field]: key });
    addBucketEntry(bucket, entry); map.set(key, bucket);
  }
  function bucketTop(counts, entities, songs) {
    // Sort once per finished bucket. Counters refer to shared identity maps,
    // rather than copying full songs/artists into every day and hour.
    return [...counts.entries()].sort(([aId, a], [bId, b]) => b.ms - a.ms || b.streams - a.streams || entities.get(aId).name.localeCompare(entities.get(bId).name) || aId.localeCompare(bId)).slice(0, 3).map(([id, count]) => {
      const entity = entities.get(id);
      return { id, name: entity.name, ...(songs ? { artist: entity.artist } : {}), ms: count.ms, streams: count.streams };
    });
  }
  function bucketDetails(bucket, maps) {
    const { songCounts, artistCounts, ...details } = bucket;
    return { ...details, topSongs: bucketTop(songCounts, maps.songs, true), topArtists: bucketTop(artistCounts, maps.artists, false) };
  }
  function bucketDTO(map, maps) {
    return [...map.values()].sort((a, b) => Object.values(a)[0].localeCompare(Object.values(b)[0])).map(bucket => ({ ...bucketDetails(bucket, maps), uniqueSongs: bucket.songCounts.size, uniqueArtists: bucket.artistCounts.size }));
  }
  function monday(time) { const date = new Date(time); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (date.getDay() + 6) % 7); return dateKey(date); }

  function analyzeEntries(entries, options = {}, fileCount = 1) {
    const validated = validateOptions(options);
    if (!entries.length) throw new Error('No valid Spotify listening history found');
    const { minMs, type, gap } = validated;
    const coverageStart = dateKey(entries[0].time), coverageEnd = dateKey(entries[entries.length - 1].time);
    const start = validated.start ?? dateBound(coverageStart);
    const end = validated.end ?? addDays(dateBound(coverageEnd), 1);
    if (end <= start) throw new Error('Start date must be before end date');
    const calendarDays = dayNumber(end) - dayNumber(start);
    const eligible = entries.filter(entry => (type === 'all' || entry.type === type) && entry.ms >= minMs);
    const selected = eligible.filter(entry => entry.time >= start && entry.time < end);
    const history = eligible.filter(entry => entry.time < end);
    const maps = mapsFor(selected), historyMaps = mapsFor(history);
    const library = {}, forgotten = [], milestones = [];
    for (const kind of Object.keys(maps)) {
      for (const entity of historyMaps[kind].values()) {
        if (kind !== 'albums') {
          const absent = Math.floor((end - 1 - entity.times[entity.times.length - 1]) / DAY);
          if (entity.streams >= 10 && absent >= 90) forgotten.push(entityDTO(entity, { daysAbsent: absent }));
          if (kind === 'songs') {
            for (const threshold of [100, 500, 1000, 5000, 10000]) {
              const hit = entity.times[threshold - 1];
              if (hit !== undefined && hit >= start && hit < end) milestones.push({ id: entity.id, name: entity.name, artist: entity.artist, kind: 'song', streams: entity.streams, ms: entity.ms, threshold, unit: 'streams', label: `${threshold} plays`, reachedAt: new Date(hit).toISOString() });
            }
          }
        }
      }
      library[kind] = orderEntities(maps[kind]).map((entity, index) => {
        const historic = historyMaps[kind].get(entity.id);
        return entityDTO(entity, { rank: index + 1, firstStream: historic.firstStream, lastStream: historic.lastStream });
      });
    }
    const artistRunning = new Map();
    for (const entry of history) {
      const prior = artistRunning.get(entry.artistId) || 0, totalMs = prior + entry.ms;
      artistRunning.set(entry.artistId, totalMs);
      if (entry.time < start) continue;
      for (const hours of [50, 100, 500, 1000, 5000]) if (prior < hours * 3600000 && totalMs >= hours * 3600000) milestones.push({ id: entry.artistId, name: entry.artist, kind: 'artist', streams: historyMaps.artists.get(entry.artistId).streams, ms: totalMs, threshold: hours, unit: 'hours', label: `${hours} hours`, reachedAt: new Date(entry.time).toISOString() });
    }
    const totals = { ms: 0, streams: selected.length, skipped: 0, skipKnown: 0, shuffle: 0, shuffleKnown: 0, offline: 0, offlineKnown: 0 };
    const dailyMap = new Map(), weeklyMap = new Map(), monthlyMap = new Map(), yearlyMap = new Map(), platforms = new Map(), countries = new Map(), repeatDays = new Map(), repeatWeeks = new Map();
    const hours = Array(24).fill(0), weekdays = Array(7).fill(0), heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    const hourBuckets = Array.from({ length: 7 }, (_, weekday) => Array.from({ length: 24 }, (_, hour) => newBucket({ weekday, hour })));
    for (const entry of selected) {
      const date = new Date(entry.time), day = dateKey(entry.time), week = monday(entry.time);
      totals.ms += entry.ms;
      for (const [field, count, known] of [['skipped', 'skipped', 'skipKnown'], ['shuffle', 'shuffle', 'shuffleKnown'], ['offline', 'offline', 'offlineKnown']]) { if (entry[field] !== null) totals[known]++; if (entry[field]) totals[count]++; }
      hours[date.getHours()] += entry.ms; weekdays[date.getDay()] += entry.ms; heatmap[date.getDay()][date.getHours()] += entry.ms;
      addBucketEntry(hourBuckets[date.getDay()][date.getHours()], entry);
      bucketAdd(dailyMap, day, entry, 'date'); bucketAdd(weeklyMap, week, entry, 'week'); bucketAdd(monthlyMap, day.slice(0, 7), entry, 'month'); bucketAdd(yearlyMap, day.slice(0, 4), entry, 'year');
      for (const [map, name] of [[platforms, entry.platform], [countries, entry.country]]) { const row = map.get(name) || { name, ms: 0, streams: 0 }; row.ms += entry.ms; row.streams++; map.set(name, row); }
      for (const [map, period, label] of [[repeatDays, day, 'day'], [repeatWeeks, week, 'week']]) {
        const key = JSON.stringify([period, entry.songId]);
        const row = map.get(key) || { id: entry.songId, name: entry.name, artist: entry.artist, date: period, streams: 0, ms: 0, period: label };
        row.streams++; row.ms += entry.ms; map.set(key, row);
      }
    }
    const daily = bucketDTO(dailyMap, maps), weekly = bucketDTO(weeklyMap, maps), monthly = bucketDTO(monthlyMap, maps), yearly = bucketDTO(yearlyMap, maps);
    const heatmapDetails = hourBuckets.map(buckets => buckets.map(bucket => bucketDetails(bucket, maps)));
    const activeDates = daily.filter(row => row.ms > 0).map(row => row.date);
    let streak = { days: 0, start: null, end: null }, current = { days: 0, start: null, end: null };
    for (const day of activeDates) {
      if (current.end && dayNumber(dateBound(day)) - dayNumber(dateBound(current.end)) === 1) { current.days++; current.end = day; }
      else current = { days: 1, start: day, end: day };
      if (current.days > streak.days) streak = { ...current };
    }
    const sessions = [];
    const intervals = selected.map(entry => ({ start: entry.time - entry.ms, end: entry.time, ms: entry.ms })).sort((a, b) => a.start - b.start);
    for (const interval of intervals) {
      let session = sessions[sessions.length - 1];
      if (!session || interval.start - session.end > gap * 60000) { session = { start: interval.start, end: interval.end, ms: 0, streams: 0 }; sessions.push(session); }
      session.end = Math.max(session.end, interval.end); session.ms += interval.ms; session.streams++;
    }
    const sessionDTOs = sessions.map(row => ({ ...row, start: new Date(row.start).toISOString(), end: new Date(row.end).toISOString() }));
    const sortBuckets = map => [...map.values()].sort((a, b) => b.ms - a.ms || a.name.localeCompare(b.name));
    Object.assign(totals, { uniqueSongs: maps.songs.size, uniqueArtists: maps.artists.size, activeDays: activeDates.length, calendarDays, avgMsPerDay: calendarDays ? Math.round(totals.ms / calendarDays) : 0, avgMsPerActiveDay: activeDates.length ? Math.round(totals.ms / activeDates.length) : 0, duration: formatDuration(totals.ms), durationString: durationString(totals.ms), avgMsPerStream: selected.length ? Math.round(totals.ms / selected.length) : 0, avgDurationString: durationString(selected.length ? totals.ms / selected.length : 0) });
    const concentration = count => totals.ms ? library.songs.slice(0, count).reduce((sum, entity) => sum + entity.ms, 0) / totals.ms * 100 : 0;
    return { version: 2, fileCount, coverage: { start: coverageStart, end: coverageEnd }, dateRange: { start: dateKey(start), end: dateKey(end - 1), firstStream: selected.length ? new Date(selected[0].time).toISOString() : null, lastStream: selected.length ? new Date(selected[selected.length - 1].time).toISOString() : null }, type, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local', totals, library, daily, weekly, monthly, yearly, hours, weekdays, heatmap, heatmapDetails, insights: { topHour: Math.max(...hours) > 0 ? hours.indexOf(Math.max(...hours)) : null, topWeekday: Math.max(...weekdays) > 0 ? WEEKDAYS[weekdays.indexOf(Math.max(...weekdays))] : null, monthlyListening: monthly.map(row => ({ ...row, durationString: durationString(row.ms) })), platforms: sortBuckets(platforms), topPlatforms: sortBuckets(platforms).slice(0, 5), countries: sortBuckets(countries), streak, records: { timeDay: daily.length ? [...daily].sort((a, b) => b.ms - a.ms)[0] : null, varietyDay: daily.length ? [...daily].sort((a, b) => b.uniqueSongs - a.uniqueSongs || b.uniqueArtists - a.uniqueArtists || b.ms - a.ms)[0] : null }, sessions: sessionDTOs, repeats: [...repeatDays.values(), ...repeatWeeks.values()].filter(row => row.streams >= (row.period === 'day' ? 3 : 5)).sort((a, b) => b.streams - a.streams || b.ms - a.ms).slice(0, 100), concentration: { top5Percent: concentration(5), top10Percent: concentration(10) }, forgotten: forgotten.sort((a, b) => b.ms - a.ms).slice(0, 100), milestones: milestones.sort((a, b) => b.reachedAt.localeCompare(a.reachedAt)), skipSongs: library.songs.filter(entity => entity.skipCount > 0).sort((a, b) => b.skipCount - a.skipCount) } };
  }
  return { normalizeEntry, normalizeEntries, analyzeEntries, validateOptions, formatDuration, durationString, dateKey };
});
