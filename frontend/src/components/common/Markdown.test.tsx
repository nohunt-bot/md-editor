import { render, screen } from '@testing-library/react'
import { Markdown } from './Markdown'
import { safeHref } from './Markdown'

describe('safeHref (link XSS guard)', () => {
  it('allows http/https/mailto and relative/anchor URLs', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com')
    expect(safeHref('http://x')).toBe('http://x')
    expect(safeHref('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(safeHref('/team')).toBe('/team')
    expect(safeHref('#section')).toBe('#section')
    expect(safeHref('./docs')).toBe('./docs')
    expect(safeHref('plain-relative')).toBe('plain-relative')
  })

  it('rejects javascript:, data:, vbscript: and control-char tricks', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref('JavaScript:alert(1)')).toBeNull()
    expect(safeHref('  javascript:alert(1)')).toBeNull()
    expect(safeHref('data:text/html,<script>')).toBeNull()
    expect(safeHref('vbscript:msgbox')).toBeNull()
    expect(safeHref('java\tscript:alert(1)')).toBeNull()
    expect(safeHref('java\nscript:alert(1)')).toBeNull()
  })
})

describe('Markdown link rendering', () => {
  it('renders a safe link as an anchor', () => {
    render(<Markdown content="[click](https://example.com)" />)
    const a = screen.getByText('click')
    expect(a.tagName).toBe('A')
    expect(a).toHaveAttribute('href', 'https://example.com')
  })

  it('renders a javascript: link as inert text, not an anchor', () => {
    const { container } = render(<Markdown content="[danger](javascript:alert 1)" />)
    // No live anchor is created for the unsafe scheme.
    expect(container.querySelector('a')).toBeNull()
    // The label text still shows (just not clickable).
    expect(container.textContent).toContain('danger')
  })
})
