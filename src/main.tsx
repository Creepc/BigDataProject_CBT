import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { StudyProvider } from '@/contexts/StudyContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudyProvider><App /></StudyProvider>
  </StrictMode>,
)
