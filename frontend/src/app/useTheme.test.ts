import { renderHook, act } from '@testing-library/react'
import { useTheme, readThemeMode } from './useTheme'

// Phase D (v2): mode persists to localStorage and resolves onto <html data-theme>.

describe('useTheme (Phase D v2)', () => {
  beforeEach(() => {
    localStorage.removeItem('theme')
    delete document.documentElement.dataset.theme
  })

  it('defaults to system mode', () => {
    expect(readThemeMode()).toBe('system')
  })

  it('setMode(dark) persists and applies data-theme=dark', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setMode('dark'))
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('setMode(light) applies data-theme=light', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setMode('light'))
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
