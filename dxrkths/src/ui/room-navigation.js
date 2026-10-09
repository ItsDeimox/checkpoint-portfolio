export const PANEL_PATHS = Object.freeze(['/berserk', '/groups', '/projects', '/about', '/contact']);

export function panelFromPath(pathname) {
  const path = String(pathname).replace(/\/+$/, '') || '/';
  const index = PANEL_PATHS.indexOf(path);
  return index < 0 ? null : index;
}

export function pathForPanel(index) {
  return PANEL_PATHS[index] || '/';
}
