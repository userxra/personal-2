import { STORE_ICON, WALLPAPER_ICON } from './builtins';
import type { IconTile } from './layout';
import type { IconLook } from './MiniappIcon';
import type { MiniappDefinition } from './sdk/types';

/** An icon tile's picture, name and page. */
export function iconLookOf(
  t: IconTile,
): IconLook & { app?: MiniappDefinition; name: string; to: string } {
  if (t.kind === 'app')
    return { ...t.app.icon, app: t.app, name: t.app.name, to: `/miniapps/${t.app.id}` };
  return t.key === 'store'
    ? { ...STORE_ICON, name: 'Store', to: '/miniapps/store' }
    : { ...WALLPAPER_ICON, name: 'Wallpaper', to: '/miniapps/wallpaper' };
}
