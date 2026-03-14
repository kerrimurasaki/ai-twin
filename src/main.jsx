import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AITwinApp from './AITwinApp'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AITwinApp />
  </StrictMode>
)
