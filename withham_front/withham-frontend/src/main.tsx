import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('=== main.tsx executing ===');
console.log('Root element:', document.getElementById('root'));

try {
  const root = createRoot(document.getElementById('root')!);
  console.log('=== React root created ===');
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  
  console.log('=== React app rendered ===');
} catch (error) {
  console.error('=== Error in main.tsx ===', error);
}
