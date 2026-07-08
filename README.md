# VerdeStats

A modern web app to visualize your Spotify Extended Streaming History.

Upload your `endsong_*.json` files (or the whole ZIP export), pick a date range, and get insights into your top songs, artists, albums, listening time, favorite weekday, peak hour, and more.

![Docker Image](https://img.shields.io/badge/docker-timo348%2Fverdestats-blue)

## Features

- Drag & drop upload for JSON files or ZIP archives
- Custom date range filtering
- Top 10 songs, artists, and albums by listening time
- Total listening time and stream count
- Monthly listening chart
- Peak listening hour and weekday
- Top platforms
- Dark green dashboard inspired by the BeamMP Manager frontend

## Quick Start with Docker

```bash
docker run -d -p 30006:3000 --name verdestats timo348/verdestats:latest
```

Then open [http://localhost:30006](http://localhost:30006).

### Docker Compose

```bash
cp .env.example .env
docker-compose up -d
```

## Usage Guide

### 1. Get your Spotify data

1. Go to [Spotify Privacy Settings](https://www.spotify.com/account/privacy/)
2. Request **Extended Streaming History**
3. Wait for the email and download the ZIP
4. Extract the ZIP to access the `endsong_*.json` files

### 2. Upload your data

1. Open VerdeStats in your browser
2. Drag and drop your `endsong_*.json` files into the upload area, **or**
3. Upload the entire Spotify ZIP archive
4. Click **Analyze Upload**

### 3. Analyze

1. Choose a **Start Date** and **End Date**
2. Optionally set a **Minimum listen time** in milliseconds (e.g. `30000` to skip tracks played less than 30 seconds)
3. Click **Run Analysis**
4. Explore your statistics:
   - Total listening time
   - Number of streams
   - Top songs, artists, and albums
   - Monthly listening chart
   - Peak hour and favorite weekday

### 4. Try the sample data

A sample streaming history file is included in the repository:

```
examples/sample-streaming-history.json
```

Upload this file to VerdeStats to test the dashboard without using your own data.

## Development

```bash
npm install
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the app listens on |
| `UPLOAD_RETENTION_MINUTES` | `30` | How long uploaded files are kept |

## License

MIT
