// Music rests cap the pill at 108px; the title gets 62 after border, padding, mark, and gap.
const MUSIC_SLOT = 62;

export function bindMarquee(root: ParentNode): void {
  const title = root.querySelector<HTMLElement>('.title');
  if (!title) return;
  const track = title.querySelector<HTMLElement>('.title-track');
  const text = title.querySelector<HTMLElement>('.title-text');
  if (!track || !text) return;
  const label = text.textContent ?? '';
  if (title.dataset.marqueeFor === label) return;
  title.querySelector('.title-ghost')?.remove();
  delete title.dataset.marquee;
  title.style.removeProperty('--marquee-duration');
  if (!label) return;
  const state = title.closest<HTMLElement>('.pill')?.dataset.state;
  const available = state === 'playing' || state === 'paused' ? MUSIC_SLOT : title.clientWidth;
  if (text.scrollWidth < 1 || available < 1) return;
  if (text.scrollWidth <= available + 1) {
    title.dataset.marqueeFor = label;
    return;
  }
  const ghost = text.cloneNode(true) as HTMLElement;
  ghost.classList.add('title-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  track.appendChild(ghost);
  const travel = text.scrollWidth + 24;
  title.style.setProperty('--marquee-duration', `${Math.max(6, Math.round(travel / 28))}s`);
  title.dataset.marquee = 'true';
  title.dataset.marqueeFor = label;
}
