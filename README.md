# Envirotech Mail Proxy — Vercel

A zero-cold-start email proxy deployed on **Vercel Serverless Functions**.

## Endpoint

`POST /api/send-email`

## Body (JSON)

```json
{
  "adminEmail": "your@gmail.com",
  "appPassword": "xxxx xxxx xxxx xxxx",
  "to": "recipient@email.com",
  "subject": "Subject here",
  "text": "Plain text body",
  "html": "<p>HTML body</p>"
}
```

## Deploy Steps

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Install Vercel CLI: `npm i -g vercel`
3. Open terminal in `mail-server-vercel/` folder
4. Run: `vercel --prod`
5. Copy the URL (e.g. `https://envirotech-mail.vercel.app`)
6. Paste it in the Envirotech ERP → System Settings → Mail Proxy URL
