import { useEffect, useState } from 'react'

// Phase D (v2): light / dark / system theme. The resolved theme is applied as
// <html data-theme="...">; token overrides live in index.css. Mode persists
// in localStorage; "system" tracks prefers-color-scheme live.

export type ThemeMode = 'light' | 'dark' | 'system'

const KEY = 'theme'

export function readThemeMode(): ThemeMode {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : 'system'
}

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function applyTheme(mode: ThemeMode) {
  const resolved = mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode
  document.documentElement.dataset.theme = resolved
}

/** Persist + apply a theme mode without the hook (used to apply server prefs). */
export function setThemeMode(mode: ThemeMode) {
  localStorage.setItem(KEY, mode)
  applyTheme(mode)
}

function readResolvedTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/**
 * The theme actually applied to <html data-theme>, kept live via a
 * MutationObserver. Used by components (e.g. diff dialogs) that need to
 * follow the resolved theme rather than the user's raw mode preference
 * ('system' isn't 'light' or 'dark').
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const [resolved, setResolved] = useState<'light' | 'dark'>(readResolvedTheme)

  useEffect(() => {
    const observer = new MutationObserver(() => setResolved(readResolvedTheme()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return resolved
}

export function useTheme(): { mode: ThemeMode; setMode: (m: ThemeMode) => void } {
  const [mode, setModeState] = useState<ThemeMode>(readThemeMode)

  useEffect(() => {
    applyTheme(mode)
    if (mode !== 'system' || !window.matchMedia) return
    // Track OS changes while in system mode.
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [mode])

  function setMode(next: ThemeMode) {
    localStorage.setItem(KEY, next)
    setModeState(next)
  }

  return { mode, setMode }
}
