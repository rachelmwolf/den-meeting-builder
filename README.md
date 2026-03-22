# Den Meeting Builder

Local-first TypeScript app for Cub Scout den leaders. It ingests official Scouting America adventure content, generates editable den meeting plans, and lets leaders chain saved plans into a lightweight year outline.

## Commands

```bash
npm install
npm run dev
```

The Vite client runs on `http://127.0.0.1:5173` and proxies API requests to the Express server on `http://127.0.0.1:3001`.

## Demo Data

The server seeds one demo adventure automatically if the SQLite database is empty. You can also reseed it explicitly:

```bash
npm run seed:demo
```

## Live Ingest

The ingestion scripts fetch public Scouting America pages and store normalized rank, adventure, requirement, and activity data in SQLite.

```bash
npm run ingest:all
npm run ingest:rank -- lion
npm run ingest:adventure -- lion bobcat-lion
```

## Verification

```bash
npm test
npm run build
```