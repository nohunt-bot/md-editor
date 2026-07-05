import { renderHook, waitFor } from '@testing-library/react'
import { usePresence } from './usePresence'

// Phase E (v2): the hook heartbeats, exposes other editors, and flags a
// version that moved past the loaded one. Degrades silently on error.

const presenceMock = vi.fn()
const leaveMock = vi.fn((_id: string) => Promise.resolve())

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    skillApi: {
      ...actual.skillApi,
      presence: (id: string) => presenceMock(id),
      leavePresence: (id: string) => leaveMock(id),
    },
  }
})

beforeEach(() => {
  presenceMock.mockReset()
  leaveMock.mockClear()
})

describe('usePresence (Phase E v2)', () => {
  it('exposes other editors from the heartbeat', async () => {
    presenceMock.mockResolvedValue({ data: { editors: ['carol'], currentVersion: 1 } })
    const { result } = renderHook(() => usePresence('s1', 1))
    await waitFor(() => expect(result.current.editors).toEqual(['carol']))
    expect(result.current.versionChanged).toBe(false)
  })

  it('flags versionChanged when live version is ahead of loaded', async () => {
    presenceMock.mockResolvedValue({ data: { editors: [], currentVersion: 3 } })
    const { result } = renderHook(() => usePresence('s1', 2))
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
  })

  it('does not poll when skillId is undefined (create mode)', () => {
    renderHook(() => usePresence(undefined, undefined))
    expect(presenceMock).not.toHaveBeenCalled()
  })

  it('degrades silently on error', async () => {
    presenceMock.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => usePresence('s1', 1))
    await waitFor(() => expect(presenceMock).toHaveBeenCalled())
    expect(result.current.editors).toEqual([])
  })

  it('leaves presence on unmount', async () => {
    presenceMock.mockResolvedValue({ data: { editors: [], currentVersion: 1 } })
    const { unmount } = renderHook(() => usePresence('s1', 1))
    await waitFor(() => expect(presenceMock).toHaveBeenCalled())
    unmount()
    expect(leaveMock).toHaveBeenCalledWith('s1')
  })
})
