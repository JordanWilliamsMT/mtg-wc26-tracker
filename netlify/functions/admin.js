// netlify/functions/admin.js
// All write operations. Password-protected.

import { getStore } from '@netlify/blobs'

function authError() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
}

function ok(data = {}) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.json().catch(() => ({}))
  const { action, password, payload } = body

  // Auth
  if (password !== process.env.ADMIN_PASSWORD) return authError()

  const store = getStore('sweepstake')

  // ── Login check ────────────────────────────────────────────────────────
  if (action === 'login') {
    return ok({ authenticated: true })
  }

  // ── Participants ────────────────────────────────────────────────────────
  if (action === 'getParticipants') {
    const data = await store.get('participants', { type: 'json' }).catch(() => ({ participants: [] }))
    return ok({ participants: data?.participants || [] })
  }

  if (action === 'saveParticipants') {
    const { participants } = payload
    await store.setJSON('participants', { participants, updatedAt: new Date().toISOString() })
    return ok()
  }

  // ── Manual moment ──────────────────────────────────────────────────────
  if (action === 'addMoment') {
    const { text } = payload
    const existing = await store.get('moments', { type: 'json' }).catch(() => ({ moments: [] }))
    const moments = existing?.moments || []
    const newMoment = {
      id: `manual-${Date.now()}`,
      type: 'manual',
      text,
      timestamp: new Date().toISOString(),
    }
    await store.setJSON('moments', {
      moments: [newMoment, ...moments].slice(0, 50),
      updatedAt: new Date().toISOString()
    })
    return ok({ moment: newMoment })
  }

  if (action === 'deleteMoment') {
    const { id } = payload
    const existing = await store.get('moments', { type: 'json' }).catch(() => ({ moments: [] }))
    const moments = (existing?.moments || []).filter(m => m.id !== id)
    await store.setJSON('moments', { moments, updatedAt: new Date().toISOString() })
    return ok()
  }

  // ── Force sync ─────────────────────────────────────────────────────────
  if (action === 'forceSync') {
    const baseUrl = process.env.URL || 'http://localhost:8888'
    const res = await fetch(`${baseUrl}/.netlify/functions/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD })
    })
    const data = await res.json()
    return ok(data)
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
}
