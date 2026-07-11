import { renderHook, act, waitFor } from '@testing-library/react'
import { useViewPrefs } from './useViewPrefs'

// GUI redesign step 2/3: card view/density follow the user across pages and
// devices, same localStorage-instant + server-override pattern as theme/language.

const getPreferencesMock = vi.fn()
const saveMock = vi.fn((_p: unknown) => Promise.resolve({ data: {} }))

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    getPreferences: () => getPreferencesMock(),
    savePreferences: (p: unknown) => saveMock(p),
  }
})

describe('useViewPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
    getPreferencesMock.mockReset().mockResolvedValue({ data: {} })
    saveMock.mockClear()
  })

  it('defaults to null (not set) when nothing is stored', async () => {
    const { result } = renderHook(() => useViewPrefs())
    await waitFor(() => expect(getPreferencesMock).toHaveBeenCalled())
    expect(result.current.view).toBeNull()
    expect(result.current.density).toBeNull()
  })

  it('setView persists to localStorage and calls savePreferences', async () => {
    const { result } = renderHook(() => useViewPrefs())
    act(() => result.current.setView('grid'))
    expect(localStorage.getItem('cardView')).toBe('grid')
    expect(result.current.view).toBe('grid')
    expect(saveMock).toHaveBeenCalledWith({ cardView: 'grid' })
  })

  it('setDensity persists to localStorage and calls savePreferences', async () => {
    const { result } = renderHook(() => useViewPrefs())
    act(() => result.current.setDensity('compact'))
    expect(localStorage.getItem('cardDensity')).toBe('compact')
    expect(result.current.density).toBe('compact')
    expect(saveMock).toHaveBeenCalledWith({ cardDensity: 'compact' })
  })

  it('migrates the legacy teamSkillsView key once', () => {
    localStorage.setItem('teamSkillsView', 'grid')
    const { result } = renderHook(() => useViewPrefs())
    expect(result.current.view).toBe('grid')
    expect(localStorage.getItem('cardView')).toBe('grid')
    expect(localStorage.getItem('teamSkillsView')).toBeNull()
  })

  it('server value overrides localStorage once loaded', async () => {
    getPreferencesMock.mockResolvedValue({ data: { cardView: 'grid', cardDensity: 'compact' } })
    const { result } = renderHook(() => useViewPrefs())
    await waitFor(() => expect(result.current.view).toBe('grid'))
    expect(result.current.density).toBe('compact')
    expect(localStorage.getItem('cardView')).toBe('grid')
    expect(localStorage.getItem('cardDensity')).toBe('compact')
  })
})
