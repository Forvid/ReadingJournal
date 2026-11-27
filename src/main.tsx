import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Не найден корневой элемент приложения.');

createRoot(root).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch((error: unknown) => {
    console.error('Не удалось подключить автономный запуск дневника.', error);
  });
}
