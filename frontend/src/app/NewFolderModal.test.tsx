import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NewFolderModal } from './NewFolderModal'

const createMock = vi.fn((_name: string, _teamId: string) => Promise.resolve({ data: {} }))
vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    folderApi: { ...actual.folderApi, create: (n: string, t: string) => createMock(n, t) },
  }
})

describe('NewFolderModal', () => {
  beforeEach(() => createMock.mockClear())

  it('creates the folder with the team id and calls onCreated', async () => {
    const onCreated = vi.fn()
    render(<NewFolderModal teamId="team-a" onClose={() => {}} onCreated={onCreated} />)
    fireEvent.change(screen.getByPlaceholderText('資料夾名稱'), { target: { value: 'Runbooks' } })
    fireEvent.click(screen.getByRole('button', { name: '建立' }))
    await waitFor(() => expect(createMock).toHaveBeenCalledWith('Runbooks', 'team-a'))
    expect(onCreated).toHaveBeenCalled()
  })

  it('disables create when the name is empty', () => {
    render(<NewFolderModal teamId="team-a" onClose={() => {}} onCreated={() => {}} />)
    expect(screen.getByRole('button', { name: '建立' })).toBeDisabled()
  })
})
