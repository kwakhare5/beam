import { iconSprite, pill } from './ui';

document.body.insertAdjacentHTML('afterbegin', iconSprite());

const app = document.querySelector<HTMLElement>('#app');

if (app) {
  app.innerHTML = pill({
    state: 'idle',
    title: 'Beam'
  });
}

document.documentElement.dataset.ready = 'true';

export {};
