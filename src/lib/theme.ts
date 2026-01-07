const KEY = 'devdox:theme'
export type Theme = 'dark' | 'light'

export function getInitialTheme(): Theme {
  const saved = localStorage.getItem(KEY)
  if (saved === 'dark' || saved === 'light') return saved
  // Default to dark mode unless the user explicitly chose otherwise.
  return 'dark'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(KEY, theme)
}


