function activateTab(tab: HTMLElement): void {
  const panelEl = tab.closest('.panel');
  if (!panelEl) return;
  const id = tab.id.replace('tab-', '');
  for (const item of panelEl.querySelectorAll<HTMLElement>('[role="tab"]')) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
  }
  for (const body of panelEl.querySelectorAll<HTMLElement>('[role="tabpanel"]')) {
    body.hidden = body.id !== `panel-${id}`;
  }
}

export function bindPanelTabs(root: Document | Element): void {
  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const tab = target.closest<HTMLElement>('[role="tab"]');
    if (tab) activateTab(tab);
  });

  root.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tab = target.closest<HTMLElement>('[role="tab"]');
    if (!tab) return;
    const panelEl = tab.closest('.panel');
    if (!panelEl) return;
    const all = [...panelEl.querySelectorAll<HTMLElement>('[role="tab"]')];
    const index = all.indexOf(tab);
    if (index === -1) return;
    event.preventDefault();
    const next =
      key === 'Home'
        ? 0
        : key === 'End'
          ? all.length - 1
          : key === 'ArrowRight'
            ? (index + 1) % all.length
            : (index - 1 + all.length) % all.length;
    const nextTab = all[next];
    if (!nextTab) return;
    nextTab.focus();
    activateTab(nextTab);
  });
}
