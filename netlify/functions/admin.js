// netlify/functions/admin.js
// All write operations. Password-protected.

import { getStore } from "@netlify/blobs";

function authError() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
  });
}

function ok(data = {}) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, password, payload } = body;

  // Auth
  if (password !== process.env.ADMIN_PASSWORD) return authError();

  const store = getStore("sweepstake");

  if (action === "seed") {
    const participants = [
      { id: "1", name: "Cait Alborn", teams: ["Sweden", "Japan"] },
      { id: "2", name: "Phoebe March", teams: ["Brazil", "Bosnia"] },
      { id: "3", name: "Richard Jansen-Parkes", teams: ["Paraguay", "Mexico"] },
      { id: "4", name: "Ashley Handley", teams: ["Canada", "Austria"] },
      { id: "5", name: "Jordan Williams", teams: ["Argentina", "Australia"] },
      { id: "6", name: "Karen McKay", teams: ["Switzerland", "Egypt"] },
      { id: "7", name: "Leigh Milne", teams: ["Turkey", "South Africa"] },
      { id: "8", name: "Jess Pullara", teams: ["Portugal", "Ivory Coast"] },
      {
        id: "9",
        name: "Tegan Goulbourne",
        teams: ["Morocco", "Czech Republic"],
      },
      { id: "10", name: "Simeon Kelly", teams: ["United States", "DR Congo"] },
      { id: "11", name: "Ollie Eggleton", teams: ["Norway", "South Korea"] },
      { id: "12", name: "Zoe Taylor", teams: ["Netherlands", "Tunisia"] },
      { id: "13", name: "Chris Holman", teams: ["France", "Saudi Arabia"] },
      { id: "14", name: "Kiki Anderson", teams: ["Uruguay", "Uzbekistan"] },
      { id: "15", name: "Jake Lacey-Watts", teams: ["Scotland", "Croatia"] },
      { id: "16", name: "Claire Leech", teams: ["Senegal", "Panama"] },
      { id: "17", name: "Fabio Musio", teams: ["Germany", "Cape Verde"] },
      { id: "18", name: "Beth Morgan", teams: ["Spain", "Iran"] },
      { id: "19", name: "Anne-Marie Howe", teams: ["Qatar", "Belgium"] },
      { id: "20", name: "Stephen Tredger", teams: ["Ghana", "Ecuador"] },
      { id: "21", name: "Clive", teams: ["Colombia", "Algeria"] },
      { id: "22", name: "Roland Renshaw", teams: ["England", "Iraq"] },
    ];
    await store.setJSON("participants", {
      participants,
      updatedAt: new Date().toISOString(),
    });
    return ok({ seeded: participants.length });
  }

  // ── Login check ────────────────────────────────────────────────────────
  if (action === "login") {
    return ok({ authenticated: true });
  }

  // ── Participants ────────────────────────────────────────────────────────
  if (action === "getParticipants") {
    const data = await store
      .get("participants", { type: "json" })
      .catch(() => ({ participants: [] }));
    return ok({ participants: data?.participants || [] });
  }

  if (action === "saveParticipants") {
    const { participants } = payload;
    await store.setJSON("participants", {
      participants,
      updatedAt: new Date().toISOString(),
    });
    return ok();
  }

  // ── Manual moment ──────────────────────────────────────────────────────
  if (action === "addMoment") {
    const { text } = payload;
    const existing = await store
      .get("moments", { type: "json" })
      .catch(() => ({ moments: [] }));
    const moments = existing?.moments || [];
    const newMoment = {
      id: `manual-${Date.now()}`,
      type: "manual",
      text,
      timestamp: new Date().toISOString(),
    };
    await store.setJSON("moments", {
      moments: [newMoment, ...moments].slice(0, 50),
      updatedAt: new Date().toISOString(),
    });
    return ok({ moment: newMoment });
  }

  if (action === "deleteMoment") {
    const { id } = payload;
    const existing = await store
      .get("moments", { type: "json" })
      .catch(() => ({ moments: [] }));
    const moments = (existing?.moments || []).filter((m) => m.id !== id);
    await store.setJSON("moments", {
      moments,
      updatedAt: new Date().toISOString(),
    });
    return ok();
  }

  // ── Force sync ─────────────────────────────────────────────────────────
  if (action === "forceSync") {
    const baseUrl = process.env.URL || "http://localhost:8888";
    const res = await fetch(`${baseUrl}/.netlify/functions/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
    });
    const data = await res.json();
    return ok(data);
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
  });
}
