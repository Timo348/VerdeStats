const test = require('node:test');
const assert = require('node:assert/strict');
process.env.TZ = 'Europe/Berlin';
const { normalizeEntry, normalizeEntries, analyzeEntries, validateOptions } = require('../public/analyzer');

function row(ts, name = 'Song', artist = 'Artist', extra = {}) {
  return { ts, ms_played: 60000, master_metadata_track_name: name, master_metadata_album_artist_name: artist, master_metadata_album_album_name: 'Album', ...extra };
}
function analyze(rows, options = {}) { return analyzeEntries(normalizeEntries(rows), options); }

test('normalization allows listening fields only and deduplicates without private source fields', () => {
  const raw = row('2024-01-01T12:00:00Z', 'Song', 'Artist', { username: 'SECRET_USER', ip_addr_decrypted: 'SECRET_IP', user_agent_decrypted: 'SECRET_AGENT', secret: 'SECRET_CUSTOM', shuffle: true });
  const entries = normalizeEntries([raw, { ...raw, username: 'OTHER_USER', ip_addr_decrypted: 'OTHER_IP' }]);
  assert.equal(entries.length, 1);
  assert.doesNotMatch(JSON.stringify(entries), /SECRET|OTHER/);
  assert.equal(normalizeEntries([raw, { ...raw, shuffle: false }]).length, 2);
  assert.equal(normalizeEntry({ ...raw, ms_played: -1 }), null);
  assert.equal(normalizeEntry({ ...raw, ts: 'not a date' }), null);
  assert.equal(normalizeEntry({ ...raw, ms_played: null }), null);
});

test('same titles and albums from different artists remain separate; URIs define tracks', () => {
  const result = analyze([
    row('2024-01-01T12:00:00Z', 'Same', 'A'), row('2024-01-01T12:01:00Z', 'Same', 'B'),
    row('2024-01-01T12:02:00Z', 'Changed label', 'A', { spotify_track_uri: 'spotify:track:abc' }),
    row('2024-01-01T12:03:00Z', 'Original label', 'A', { spotify_track_uri: 'spotify:track:abc' })
  ]);
  assert.equal(result.library.songs.length, 3);
  assert.equal(result.library.albums.length, 2);
  assert.equal(result.library.songs[0].streams, 2);
  for (const song of result.library.songs) assert.ok(result.library.artists.find(artist => artist.id === song.artistId).songIds.includes(song.id));
});

test('local dates include the full end day and selected coverage starts with archive', () => {
  const rows = [row('2024-01-01T22:59:59Z'), row('2024-01-01T23:00:00Z'), row('2024-01-02T22:59:59Z'), row('2024-01-02T23:00:00Z')];
  const result = analyze(rows, { startDate: '2024-01-02', endDate: '2024-01-02' });
  assert.equal(result.totals.streams, 2);
  assert.equal(result.dateRange.start, '2024-01-02');
  assert.equal(result.dateRange.end, '2024-01-02');
  assert.equal(result.timezone, 'Europe/Berlin');
  assert.equal(result.hours[0], 60000);
  assert.equal(result.hours[23], 60000);
  const archive = analyze(rows);
  assert.deepEqual(archive.coverage, { start: '2024-01-01', end: '2024-01-03' });
});

test('DST listening averages and streaks use calendar days rather than 24-hour lengths', () => {
  const result = analyze([row('2024-03-30T12:00:00Z'), row('2024-03-31T12:00:00Z')], { startDate: '2024-03-31', endDate: '2024-03-31' });
  assert.equal(result.totals.calendarDays, 1);
  assert.equal(result.totals.avgMsPerDay, 60000);
  const streak = analyze([row('2024-03-30T12:00:00Z'), row('2024-03-31T12:00:00Z'), row('2024-04-01T12:00:00Z')]);
  assert.equal(streak.insights.streak.days, 3);
});

test('music, podcasts and unknown feature flags have independent honest denominators', () => {
  const rows = [row('2024-01-01T12:00:00Z', 'A', 'Artist', { skipped: true, shuffle: false, offline: true }), row('2024-01-01T12:01:00Z', 'B', 'Artist'), { ts: '2024-01-01T12:02:00Z', ms_played: 300000, episode_name: 'Episode', episode_show_name: 'Show', skipped: false, shuffle: true, offline: false }];
  const music = analyze(rows), podcast = analyze(rows, { type: 'podcast' }), all = analyze(rows, { type: 'all' });
  assert.equal(music.totals.ms, 120000);
  assert.equal(podcast.totals.ms, 300000);
  assert.equal(all.totals.ms, 420000);
  assert.equal(music.totals.skipKnown, 1);
  assert.equal(music.totals.skipped, 1);
  assert.equal(music.totals.shuffleKnown, 1);
  assert.equal(music.totals.shuffle, 0);
  assert.equal(music.totals.offlineKnown, 1);
  assert.equal(podcast.library.artists[0].name, 'Show');
  assert.equal(all.totals.uniqueSongs, 3);
});

test('empty selected periods report zero and no invented peak or record', () => {
  const result = analyze([row('2024-01-01T12:00:00Z')], { startDate: '2024-02-01', endDate: '2024-02-02' });
  assert.equal(result.totals.streams, 0);
  assert.equal(result.totals.ms, 0);
  assert.equal(result.insights.topHour, null);
  assert.equal(result.insights.topWeekday, null);
  assert.equal(result.insights.records.timeDay, null);
  assert.equal(result.insights.records.varietyDay, null);
  assert.deepEqual(result.library.songs, []);
  assert.equal(result.insights.streak.days, 0);
});

test('only current ranks remain with no previous-period, new-in-import, comeback or forgotten DTO', () => {
  const result = analyze([
    row('2024-01-01T12:00:00Z', 'A', 'Artist', { ms_played: 300000 }), row('2024-01-01T13:00:00Z', 'B', 'Artist'),
    row('2024-01-02T12:00:00Z', 'A', 'Artist'), row('2024-01-02T13:00:00Z', 'B', 'Artist', { ms_played: 300000 })
  ], { startDate: '2024-01-02', endDate: '2024-01-02' });
  assert.equal(result.library.songs[0].name, 'B');
  assert.equal(result.library.songs[0].rank, 1);
  assert.equal(result.library.songs[1].rank, 2);
  assert.equal('comparison' in result, false);
  assert.equal('comebacks' in result.insights, false);
  assert.equal('forgotten' in result.insights, false);
  for (const entity of Object.values(result.library).flat()) {
    for (const field of ['previousRank', 'rankChange', 'isNew', 'comeback', 'returnedAt', 'daysAbsent']) assert.equal(field in entity, false, field);
  }
});

test('hour and timeline hover details aggregate selected plays and return only top three identities', () => {
  const rows = [
    row('2024-01-01T12:00:00Z', 'A', 'Alice'),
    row('2024-01-01T12:01:00Z', 'B', 'Bob', { ms_played: 120000 }),
    row('2024-01-01T12:02:00Z', 'C', 'Alice', { ms_played: 180000, username: 'SECRET_USER', ip_addr_decrypted: 'SECRET_IP' }),
    row('2024-01-01T12:03:00Z', 'D', 'Carol', { ms_played: 240000 }),
    row('2024-01-01T12:04:00Z', 'Below minimum', 'Filtered artist', { ms_played: 30000 }),
    row('2024-01-08T12:00:00Z', 'A', 'Alice', { ms_played: 300000 }),
    { ts: '2024-01-02T12:00:00Z', ms_played: 999000, episode_name: 'Filtered podcast', episode_show_name: 'Filtered show' },
    row('2024-02-01T12:00:00Z', 'Outside date range', 'Filtered artist', { ms_played: 999000 })
  ];
  const result = analyze(rows, { startDate: '2024-01-01', endDate: '2024-01-08', minMs: 60000, type: 'music' });
  const hour = result.heatmapDetails[1][13];
  assert.deepEqual({ weekday: hour.weekday, hour: hour.hour, ms: hour.ms, streams: hour.streams }, { weekday: 1, hour: 13, ms: 900000, streams: 5 });
  assert.equal(result.heatmap[1][13], hour.ms);
  assert.deepEqual(hour.topSongs.map(({ name, artist, ms, streams }) => ({ name, artist, ms, streams })), [
    { name: 'A', artist: 'Alice', ms: 360000, streams: 2 },
    { name: 'D', artist: 'Carol', ms: 240000, streams: 1 },
    { name: 'C', artist: 'Alice', ms: 180000, streams: 1 }
  ]);
  assert.deepEqual(hour.topArtists.map(({ name, ms, streams }) => ({ name, ms, streams })), [
    { name: 'Alice', ms: 540000, streams: 3 },
    { name: 'Carol', ms: 240000, streams: 1 },
    { name: 'Bob', ms: 120000, streams: 1 }
  ]);
  const day = result.daily.find(day => day.date === '2024-01-01');
  assert.equal(day.ms, 600000);
  assert.equal(day.streams, 4);
  assert.deepEqual(day.topSongs.map(song => song.name), ['D', 'C', 'B']);
  assert.deepEqual(day.topArtists.map(artist => [artist.name, artist.ms, artist.streams]), [['Alice', 240000, 2], ['Carol', 240000, 1], ['Bob', 120000, 1]]);
  assert.deepEqual(result.weekly[0].topSongs, day.topSongs);
  assert.deepEqual(result.weekly[1].topSongs.map(song => [song.name, song.ms, song.streams]), [['A', 300000, 1]]);
  assert.deepEqual(result.monthly[0].topSongs, hour.topSongs);
  assert.deepEqual(result.yearly[0].topArtists, hour.topArtists);
  for (const bucket of [...result.daily, ...result.weekly, ...result.monthly, ...result.yearly, ...result.heatmapDetails.flat()]) {
    assert.ok(bucket.topSongs.length <= 3);
    assert.ok(bucket.topArtists.length <= 3);
    for (const song of bucket.topSongs) assert.ok(result.library.songs.some(entity => entity.id === song.id));
    for (const artist of bucket.topArtists) assert.ok(result.library.artists.some(entity => entity.id === artist.id));
  }
  assert.doesNotMatch(JSON.stringify(result), /SECRET|Filtered|Outside date/);
});

test('unheard day/hour buckets expose zero totals and empty hover lists', () => {
  const result = analyze([row('2024-01-01T12:00:00Z')], { startDate: '2024-02-01', endDate: '2024-02-02' });
  assert.equal(result.heatmapDetails.length, 7);
  for (let weekday = 0; weekday < 7; weekday++) {
    assert.equal(result.heatmapDetails[weekday].length, 24);
    for (let hour = 0; hour < 24; hour++) assert.deepEqual(result.heatmapDetails[weekday][hour], { weekday, hour, ms: 0, streams: 0, topSongs: [], topArtists: [] });
  }
  assert.deepEqual(result.daily, []);
  assert.deepEqual(result.weekly, []);
  assert.deepEqual(result.monthly, []);
  assert.deepEqual(result.yearly, []);
});

test('podcast hover details contain only selected episodes and shows', () => {
  const result = analyze([
    row('2024-01-01T12:00:00Z', 'Music song', 'Music artist'),
    { ts: '2024-01-01T12:01:00Z', ms_played: 600000, episode_name: 'Episode', episode_show_name: 'Show' }
  ], { type: 'podcast' });
  assert.deepEqual(result.heatmapDetails[1][13].topSongs.map(song => [song.name, song.artist, song.ms]), [['Episode', 'Show', 600000]]);
  assert.deepEqual(result.daily[0].topArtists.map(artist => [artist.name, artist.streams]), [['Show', 1]]);
});

test('milestone crossing, repeats, diversity and concentration come from actual plays', () => {
  const rows = Array.from({ length: 100 }, (_, i) => row(new Date(Date.UTC(2024, 0, 1, 12, i)).toISOString(), 'Repeated'));
  rows.push(row('2024-01-02T12:00:00Z', 'Another', 'Other Artist'));
  const result = analyze(rows);
  assert.ok(result.insights.milestones.some(item => item.kind === 'song' && item.threshold === 100));
  assert.ok(result.insights.repeats.some(item => item.period === 'day' && item.streams === 100));
  assert.ok(result.insights.repeats.some(item => item.period === 'week' && item.streams === 101) === false);
  assert.equal(result.insights.streak.days, 2);
  assert.equal(result.monthly[0].uniqueSongs, 2);
  assert.equal(result.yearly[0].uniqueArtists, 2);
  assert.equal(result.daily[0].uniqueSongs, 1);
  assert.equal(result.insights.records.timeDay.streams, 100);
  assert.equal(result.insights.concentration.top5Percent, 100);
});

test('sessions reconstruct stream starts and merge overlaps before applying gap', () => {
  const result = analyze([
    row('2024-01-01T12:00:00Z', 'A', 'Artist', { ms_played: 60000 }),
    row('2024-01-01T12:45:00Z', 'B', 'Artist', { ms_played: 30 * 60000 }),
    row('2024-01-01T13:40:00Z', 'C', 'Artist', { ms_played: 60000 })
  ]);
  assert.equal(result.insights.sessions.length, 2);
  assert.equal(result.insights.sessions[0].streams, 2);
  assert.equal(result.insights.sessions[0].start, '2024-01-01T11:59:00.000Z');
  assert.equal(result.insights.sessions[0].end, '2024-01-01T12:45:00.000Z');
});

test('platforms and countries group metadata without IP geolocation', () => {
  const result = analyze([
    row('2024-01-01T12:00:00Z', 'A', 'Artist', { platform: 'Android OS 14', conn_country: 'de' }),
    row('2024-01-01T12:01:00Z', 'B', 'Artist', { platform: 'android', conn_country: 'DE' }),
    row('2024-01-01T12:02:00Z', 'C', 'Artist', { platform: 'web_player chrome', ip_addr_decrypted: '123.123.123.123' })
  ]);
  assert.equal(result.insights.platforms[0].name, 'Android');
  assert.equal(result.insights.platforms[0].streams, 2);
  assert.equal(result.insights.countries[0].name, 'DE');
  assert.ok(result.insights.countries.some(item => item.name === 'Unknown'));
});

test('invalid filter values fail before calculation', () => {
  assert.throws(() => validateOptions({ startDate: '2024-02-30' }), /Invalid/);
  assert.throws(() => validateOptions({ startDate: '2024-02-02', endDate: '2024-02-01' }), /before/);
  assert.throws(() => validateOptions({ minMs: -1 }), /minimum/);
  assert.throws(() => validateOptions({ type: 'anything' }), /type/);
  assert.throws(() => validateOptions({ sessionGapMinutes: 0 }), /gap/);
});
