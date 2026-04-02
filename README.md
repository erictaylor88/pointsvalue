# PointsValue

Compute the real value of award flights by bridging mileage costs with cash pricing.

## Structure

```
pointsvalue/
├── app/          # Next.js frontend + API routes (Vercel)
└── api/          # FastAPI Python service — Google Flights pricing (Railway)
```

## Development

### Frontend (Next.js)

```bash
cd app
npm install
npm run dev
```

### Flight Pricing Service (Python)

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload
```

## Environment Variables

See deployment config (not committed) for required env vars per service.
