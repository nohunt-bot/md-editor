import { renderHook, act } from '@testing-library/react'
import { useTheme, readThemeMode, useResolvedTheme } from './useTheme'

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

describe('useResolvedTheme', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('defaults to light when data-theme is unset', () => {
    const { result } = renderHook(() => useResolvedTheme())
    expect(result.current).toBe('light')
  })

  it('reflects the initial data-theme value', () => {
    document.documentElement.dataset.theme = 'dark'
    const { result } = renderHook(() => useResolvedTheme())
    expect(result.current).toBe('dark')
  })

  it('updates live when data-theme mutates (MutationObserver)', async () => {
    const { result } = renderHook(() => useResolvedTheme())
    expect(result.current).toBe('light')

    await act(async () => {
      document.documentElement.dataset.theme = 'dark'
      // Let the MutationObserver's microtask queue flush.
      await Promise.resolve()
    })

    expect(result.current).toBe('dark')
  })
})
