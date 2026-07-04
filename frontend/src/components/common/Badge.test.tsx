import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders a published badge for status "published"', () => {
    render(<Badge status="published" />)
    const el = screen.getByText('published')
    expect(el).toBeInTheDocument()
    expect(el).toHaveClass('badge', 'badge-published')
  })

  it('renders a draft badge for status "draft"', () => {
    render(<Badge status="draft" />)
    const el = screen.getByText('draft')
    expect(el).toHaveClass('badge', 'badge-draft')
  })

  it('falls back to draft when status is undefined', () => {
    render(<Badge />)
    const el = screen.getByText('draft')
    expect(el).toHaveClass('badge-draft')
  })
})
