import { useState, useCallback } from 'react'

async function adminCall(action, payload = {}, password) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, password, payload }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Admin call failed')
  return data
}

export function useAdmin() {
  const [authed,   setAuthed]   = useState(() => !!sessionStorage.getItem('wc26_admin'))
  const [password, setPassword] = useState(() => sessionStorage.getItem('wc26_admin') || '')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const login = useCallback(async (pw) => {
    setLoading(true)
    setError('')
    try {
      await adminCall('login', {}, pw)
      setPassword(pw)
      setAuthed(true)
      sessionStorage.setItem('wc26_admin', pw)
    } catch (e) {
      setError('Wrong password')
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setAuthed(false)
    setPassword('')
    sessionStorage.removeItem('wc26_admin')
  }, [])

  const call = useCallback(async (action, payload) => {
    setLoading(true)
    try {
      return await adminCall(action, payload, password)
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [password])

  return { authed, login, logout, call, loading, error, setError }
}
