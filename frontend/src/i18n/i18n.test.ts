import i18n, { readLang, setLanguage } from './index'

// Phase F (v2): language switching resolves the right resource + persists.

describe('i18n framework (Phase F v2)', () => {
  afterEach(() => {
    setLanguage('zh-TW')
  })

  it('defaults to zh-TW and resolves Chinese', () => {
    setLanguage('zh-TW')
    expect(readLang()).toBe('zh-TW')
    expect(i18n.t('shell:myTeam')).toBe('我的團隊')
  })

  it('switches to English and resolves English + persists', () => {
    setLanguage('en')
    expect(localStorage.getItem('lang')).toBe('en')
    expect(i18n.t('shell:myTeam')).toBe('My Team')
    expect(i18n.t('shell:openSpace')).toBe('Open Space')
  })

  it('interpolates variables', () => {
    setLanguage('en')
    expect(i18n.t('pagination:status', { page: 2, total: 5 })).toBe('Page 2 / 5')
  })
})
