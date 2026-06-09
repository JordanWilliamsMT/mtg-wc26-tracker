// netlify/functions/poll.js
// Runs every 5 minutes via Netlify scheduler
// Only burns API quota if there are live/imminent games today
// Calls sync with a lightweight header so sync skips standings+odds

import { getStore } from '@netlify/blobs'

export default async function handler(req) {
  if (!process.env.ENABLE_LIVE_POLL) {
    return new Response('Live polling disabled', { status: 200 })
  }

  const store = getStore('sweepstake')
  const meta = await store.get('meta', { type: 'json' }).catch(() => null)

  // Don't burn quota if no games today
  if (!meta?.hasGamesToday) {
    return new Response(JSON.stringify({ skipped: true, reason: 'No games today' }), { status: 200 })
  }

  // Trigger the main sync but flag it as a live poll (skips standings + odds)
  const baseUrl = process.env.URL || 'http://localhost:8888'
  const res = await fetch(`${baseUrl}/.netlify/functions/sync`, {
    method: 'GET',
    headers: { 'x-poll-type': 'live' }
  })

  const data = await res.json()
  return new Response(JSON.stringify({ polled: true, ...data }), { status: 200 })
}
