# Den Meeting Builder

Local-first TypeScript app for Cub Scout den leaders. It ingests official Scouting America adventure content, generates editable den meeting plans, and lets leaders chain saved plans into a lightweight year outline.

## AWS Deployment

The app now has a container-first deployment path for AWS:

- `Dockerfile` builds the frontend and server into one image
- `docker-compose.yml` runs the container locally with a persistent data volume
- `.github/workflows/deploy.yml` builds, pushes to ECR, and deploys to ECS

Required AWS environment variables and secrets:

- `AWS_REGION`
- `ECR_REPOSITORY`
- `AWS_ROLE_TO_ASSUME`
- `ECS_CLUSTER`
- `ECS_SERVICE`
- `AWS_ECS_TASK_EXECUTION_ROLE_ARN`
- `AWS_ECS_TASK_ROLE_ARN`

The current runtime still uses the app's SQLite file, but it is now mounted through `/data` so the same container can run locally or on ECS with persistent storage attached.

## Commands

```bash
npm install
npm run dev
```

The Vite client runs on `http://127.0.0.1:5173` and proxies API requests to the Express server on `http://127.0.0.1:3001`.

For container parity, you can also run:

```bash
docker compose up --build
```

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

## GitHub Sync

Local development still uses normal git commits, but GitHub publishing in this workspace should use the connector path instead of `git push`.

```bash
npm run verify:checkpoint
git add .
git commit -m "Meaningful checkpoint"
npm run publish:connector
```

The publish script:

- runs `npm run verify:checkpoint` by default before publishing
- reads the current local `HEAD` commit message
- publishes tracked changes from the last published local commit to `HEAD`
- checks that GitHub `main` still matches the expected parent commit
- stops instead of forcing an update if remote `main` has drifted

This keeps GitHub current at meaningful checkpoints without relying on local git credentials. The connector currently publishes file-by-file updates on the remote side, so GitHub history may contain multiple connector commits for one local checkpoint. The script stores the last published local and remote commit IDs in local git refs so later publishes only send new local work.

If you need to bypass the preflight temporarily, set `SKIP_PUBLISH_VERIFY=1` when running `npm run publish:connector`.