// netlify/functions/data.js
// Single read endpoint — frontend fetches /api/data?key=fixtures etc.
// Reads from Netlify Blobs, never calls external APIs directly

import { getStore } from '@netlify/blobs'

const ALLOWED_KEYS = ['fixtures', 'standings', 'odds', 'participants', 'moments', 'meta']

export default async function handler(req) {
  const url    = new URL(req.url)
  const key    = url.searchParams.get('key')

  if (!key || !ALLOWED_KEYS.includes(key)) {
    return new Response(JSON.stringify({ error: 'Invalid key' }), { status: 400 })
  }

  const store = getStore('sweepstake')
  const data  = await store.get(key, { type: 'json' }).catch(() => null)

  return new Response(JSON.stringify(data ?? {}), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    }
  })
}
