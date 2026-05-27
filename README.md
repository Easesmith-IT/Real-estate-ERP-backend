# Real-estate-ERP-backend

## Setup

```bash
npm install
npm run dev
```

Default runtime port is `5000`.

## Environment variables

- `PORT` default `5000`
- `NODE_ENV` default `development`
- `MONGODB_URI` MongoDB Atlas connection string
- `MONGODB_DB_NAME` optional database name override

## API endpoints

- `GET /` service banner and timestamp
- `GET /api/health` health payload with uptime, timestamp, and DB status
- `GET /api/health/error` forced error endpoint for error-handler validation
