import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FirebaseUIProvider } from '@firebase-oss/ui-react'
import { ui } from './firebase.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseUIProvider ui={ui}>
      <App />
    </FirebaseUIProvider>
  </StrictMode>,
)
