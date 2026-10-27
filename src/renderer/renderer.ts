import { iconSprite, pill } from './views';

document.body.insertAdjacentHTML('afterbegin', iconSprite());

const app = document.querySelector<HTMLElement>('#app');

if (app) {
  app.innerHTML = pill({
    size: 'idle',
    state: 'idle',
    title: 'Beam',
    artist: 'Alt+Space',
    mascot: 'idle'
  });
}

document.documentElement.dataset.ready = 'true';

export {};
