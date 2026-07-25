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
- `BLOB_READ_WRITE_TOKEN` required for document uploads on Vercel Blob

## API endpoints

- `GET /` service banner and timestamp
- `GET /api/health` health payload with uptime, timestamp, and DB status
- `GET /api/health/error` forced error endpoint for error-handler validation
- `POST /api/uploads/document` stores files in Vercel Blob and registers the document
- `GET /api/uploads/:filename` redirects to the matching Blob object
