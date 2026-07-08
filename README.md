# VerdeStats

A modern web app to visualize your Spotify Extended Streaming History.

Upload your `endsong_*.json` files (or the whole ZIP export), pick a date range, and get insights into your top songs, artists, albums, listening time, favorite weekday, peak hour, and more.

## Features

- Drag & drop upload for JSON files or ZIP archives
- Custom date range filtering
- Top 10 songs, artists, and albums by listening time
- Total listening time and stream count
- Monthly listening chart
- Peak listening hour and weekday
- Top platforms
- Dark green dashboard inspired by the BeamMP Manager frontend

## Run with Docker

```bash
docker run -d -p 30006:3000 --name verdestats timo348/verdestats:latest
```

Or use Docker Compose:

```bash
cp .env.example .env
docker-compose up -d
```

Then open `http://localhost:30006`.

## Development

```bash
npm install
npm start
```

## Get your Spotify data

1. Go to [Spotify Privacy Settings](https://www.spotify.com/account/privacy/)
2. Request **Extended Streaming History**
3. Wait for the email and download the ZIP
4. Upload the ZIP or extract the JSON files to VerdeStats

## License

MIT
