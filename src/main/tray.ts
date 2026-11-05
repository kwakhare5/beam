import { Menu, Tray, nativeImage } from 'electron';
import { trayIconPath } from './paths';

export function createTray(
  onSettings: () => void,
  onReset: () => void,
  onToggle: () => void,
  onHide: () => void,
  onQuit: () => void
): Tray {
  const icon = nativeImage.createFromPath(trayIconPath());
  const tray = new Tray(icon);
  tray.setToolTip('Beam');
  tray.on('click', onToggle);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Settings', enabled: false, click: onSettings },
      { label: 'Reset Position', click: onReset },
      { label: 'Hide', click: onHide },
      { type: 'separator' },
      { label: 'Quit', click: onQuit }
    ])
  );
  return tray;
}
