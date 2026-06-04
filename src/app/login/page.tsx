'use client'

import { useState } from 'react'
import { loginAction } from './actions'
import styles from './login.module.css'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [requiresNewPin, setRequiresNewPin] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const res = await loginAction(formData)
    if (res?.requiresNewPin) {
      setRequiresNewPin(true)
      setMessage(res.message || 'Please set a new PIN.')
      return
    }
    if (res?.error) {
      setError(res.error)
    }
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome to MathCraft</h1>
        <p className={styles.subtitle}>Explore one mine at a time.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="name">Miner Name</label>
            <input type="text" id="name" name="name" required placeholder="e.g. Yao, Sean..." />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="pin">PIN or Password</label>
            <input type="password" id="pin" name="pin" required placeholder="****" />
          </div>

          {requiresNewPin && (
            <div className={styles.inputGroup}>
              <label htmlFor="newPin">New Secret PIN</label>
              <input type="password" id="newPin" name="newPin" required placeholder="****" autoFocus />
            </div>
          )}

          {message && !error && <p className={styles.success}>{message}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn}>
            Enter the Mine
          </button>
        </form>
      </div>
    </div>
  )
}
