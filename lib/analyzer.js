const fs = require('fs');
const path = require('path');

const MS_PER_HOUR = 3600000;
const MS_PER_MINUTE = 60000;
const MS_PER_SECOND = 1000;

function parseSpotifyDate(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / MS_PER_SECOND);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, totalSeconds, ms };
}

function durationString(ms) {
  const { hours, minutes, seconds } = formatDuration(ms);
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function sortMapByValue(map, limit = 10) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, ms]) => ({
      name,
      ms,
      duration: formatDuration(ms),
      durationString: durationString(ms)
    }));
}

function analyzeDirectory(dirPath, options = {}) {
  const { startDate, endDate, minMs = 0 } = options;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (start && isNaN(start.getTime())) throw new Error('Invalid start date');
  if (end && isNaN(end.getTime())) throw new Error('Invalid end date');

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error('No JSON files found in upload');
  }

  let totalMs = 0;
  let streamCount = 0;
  let skippedCount = 0;
  const songMap = new Map();
  const artistMap = new Map();
  const albumMap = new Map();
  const hourMap = new Array(24).fill(0);
  const weekdayMap = new Array(7).fill(0);
  const monthlyMap = new Map();
  const platformMap = new Map();

  let firstDate = null;
  let lastDate = null;
  let topTrackEver = { name: null, ms: 0 };

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    let data;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(raw);
    } catch (err) {
      continue; // skip broken JSON
    }

    if (!Array.isArray(data)) continue;

    for (const entry of data) {
      if (!entry || typeof entry !== 'object') continue;

      const ts = parseSpotifyDate(entry.ts);
      if (!ts) continue;

      if (start && ts < start) continue;
      if (end && ts > end) continue;

      const ms = Number(entry.ms_played) || 0;
      if (ms < minMs) continue;

      const track = entry.master_metadata_track_name;
      const artist = entry.master_metadata_album_artist_name;
      const album = entry.master_metadata_album_name;

      totalMs += ms;
      streamCount += 1;

      if (entry.skipped === true || entry.reason_end === 'endplay') {
        // reason_end 'endplay' is not a skip; only explicit skip counts
      }
      if (entry.skipped === true) skippedCount += 1;

      if (track) {
        songMap.set(track, (songMap.get(track) || 0) + ms);
        if ((songMap.get(track) || 0) > topTrackEver.ms) {
          topTrackEver = { name: track, ms: songMap.get(track) || 0 };
        }
      }
      if (artist) artistMap.set(artist, (artistMap.get(artist) || 0) + ms);
      if (album) albumMap.set(album, (albumMap.get(album) || 0) + ms);

      hourMap[ts.getHours()] += ms;
      weekdayMap[ts.getDay()] += ms;

      const monthKey = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + ms);

      const platform = entry.platform || 'unknown';
      platformMap.set(platform, (platformMap.get(platform) || 0) + ms);

      if (!firstDate || ts < firstDate) firstDate = ts;
      if (!lastDate || ts > lastDate) lastDate = ts;
    }
  }

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const topHour = hourMap.indexOf(Math.max(...hourMap));
  const topWeekdayIndex = weekdayMap.indexOf(Math.max(...weekdayMap));

  const monthlyListening = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, ms]) => ({ month, ms, durationString: durationString(ms) }));

  const topPlatforms = sortMapByValue(platformMap, 5);

  return {
    fileCount: files.length,
    dateRange: {
      start: start ? start.toISOString().split('T')[0] : null,
      end: end ? end.toISOString().split('T')[0] : null,
      firstStream: firstDate ? firstDate.toISOString() : null,
      lastStream: lastDate ? lastDate.toISOString() : null
    },
    totals: {
      ms: totalMs,
      streams: streamCount,
      skipped: skippedCount,
      duration: formatDuration(totalMs),
      durationString: durationString(totalMs),
      avgMsPerStream: streamCount ? Math.round(totalMs / streamCount) : 0,
      avgDurationString: streamCount ? durationString(Math.round(totalMs / streamCount)) : '0s'
    },
    topSongs: sortMapByValue(songMap, 10),
    topArtists: sortMapByValue(artistMap, 10),
    topAlbums: sortMapByValue(albumMap, 10),
    insights: {
      topHour,
      topWeekday: weekdays[topWeekdayIndex],
      monthlyListening,
      topPlatforms
    }
  };
}

module.exports = { analyzeDirectory, formatDuration, durationString };
