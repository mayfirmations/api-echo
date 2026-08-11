# api-echo

![CI](https://github.com/YOUR_USERNAME/api-echo/actions/workflows/ci.yml/badge.svg)
![npm version](https://img.shields.io/npm/v/api-echo)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)

> A mock API server that **records and replays** HTTP requests for testing — zero config, zero dependencies on external services.

## Features

- 🔴 **Record mode** — proxy real API calls and save them to disk
- 🟢 **Replay mode** — serve saved responses without hitting real APIs
- 🔄 **Passthrough mode** — proxy without recording
- 📁 **File-based storage** — responses saved as JSON, human-readable
- ⚡ **Zero-latency replay** — instant responses from local fixtures
- 🔍 **Request inspector** — view all recorded requests via dashboard

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/api-echo.git
cd api-echo
npm install
bash scripts/setup.sh
```

## Quick Start

```bash
# Start in record mode (proxies to target, saves responses)
npm run start:record -- --target https://api.example.com --port 3000

# Start in replay mode (serves saved responses)
npm run start:replay -- --port 3000

# Start interactive dashboard
npm start
```

## Usage

### Record Mode
```bash
node src/api-echo.js --mode record --target https://jsonplaceholder.typicode.com --port 3000
# Now send requests to http://localhost:3000 — they get recorded
curl http://localhost:3000/todos/1
```

### Replay Mode
```bash
node src/api-echo.js --mode replay --port 3000
# Serves recorded responses instantly
curl http://localhost:3000/todos/1
```

### List Recorded Requests
```bash
node src/api-echo.js --list
```

### Clear All Recordings
```bash
node src/api-echo.js --clear
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--mode` | `replay` | `record`, `replay`, or `passthrough` |
| `--target` | — | Target API URL (required in record mode) |
| `--port` | `3000` | Local port to listen on |
| `--dir` | `./recordings` | Directory to store recordings |
| `--delay` | `0` | Add artificial delay to replays (ms) |
| `--list` | — | List all recordings and exit |
| `--clear` | — | Delete all recordings and exit |

## File Format

Recordings are stored in `./recordings/` as JSON:
```json
{
  "request": {
    "method": "GET",
    "path": "/todos/1",
    "headers": {},
    "body": null,
    "timestamp": "2025-01-01T00:00:00.000Z"
  },
  "response": {
    "status": 200,
    "headers": { "content-type": "application/json" },
    "body": { "id": 1, "title": "delectus aut autem" }
  }
}
```

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start in replay mode |
| `npm run start:record` | Start in record mode |
| `npm run start:replay` | Start in replay mode |
| `npm test` | Run test suite |
| `npm run tracker` | Show achievement progress |
| `npm run roadmap` | Show Day 1 → Month 1 roadmap |

## Achievement Scripts

```bash
bash scripts/unlock-all.sh        # Interactive achievement menu
bash scripts/quickdraw.sh         # Quick Draw badge
bash scripts/yolo.sh              # YOLO badge
bash scripts/publicist.sh         # Publicist badge (v1.0.0 release)
bash scripts/pull-shark.sh 2      # Pull Shark Bronze
bash scripts/pull-shark.sh 16     # Pull Shark Silver
bash scripts/pull-shark.sh 128    # Pull Shark Gold
bash scripts/pair-extraordinaire.sh "Name" "email@example.com"
```

## License

MIT — see [LICENSE](LICENSE)
