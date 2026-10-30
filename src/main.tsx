import { createRoot } from 'react-dom/client'
import { getTheme } from './theme'
import App from './App'
import './styles.css'

document.documentElement.dataset.theme = getTheme()

createRoot(document.getElementById('root')!).render(<App />)
