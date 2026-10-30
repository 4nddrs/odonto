export type Theme = 'dark' | 'light'

export function getTheme(): Theme {
  try {
    return localStorage.getItem('odonto.theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}
