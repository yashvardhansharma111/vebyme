/**
 * Mapping from assets/icons/*.svg filenames (without .svg) to React icons used in the app.
 * Use these instead of importing SVG assets; icons are from Ionicons unless noted.
 *
 * Asset file                    → React icon (Ionicons) or { set, name } for other sets
 */
export const ASSET_ICON_MAP: Record<string, string> = {
  // Map pin / location
  'Map pin': 'location-outline',
  'Map pin-1': 'location-outline',

  // Tickets
  'Ticket_alt': 'pricetag-outline',
  'Two Tickets': 'pricetag-outline',

  // Calendar
  'Calendar_check': 'calendar-outline',

  // Dress code (t-shirt)
  't-shirt (1) 1': 'shirt-outline',

  // Faces / reactions (for future use, e.g. feedback)
  'smiling-face 1': 'happy-outline',
  'happy-face 1': 'happy-outline',
  'sad-face 1': 'sad-outline',
  'confused 1': 'help-circle-outline',

  // Finish / flag
  'finish-flag 1': 'flag-outline',
  'finish-flag 2': 'flag-outline',

  // Navigation
  'Navigation 2': 'navigate-outline',
};

/** Icon set preference when not Ionicons (for components that support multiple sets) */
export type IconFamily = 'Ionicons' | 'FontAwesome5' | 'MaterialIcons';

export const ASSET_ICON_EXTENDED: Record<string, { set: IconFamily; name: string }> = {
  'starting_point': { set: 'FontAwesome5', name: 'flag-checkered' },
  'dress_code': { set: 'Ionicons', name: 'shirt-outline' },
  'distance': { set: 'FontAwesome5', name: 'running' },
  'f&b': { set: 'MaterialIcons', name: 'fastfood' },
};

/**
 * Get Ionicons name for an asset icon key (e.g. "Map pin", "Ticket_alt").
 * Falls back to a generic icon if not in map.
 */
export function getIoniconsNameForAsset(assetKey: string): string {
  const normalized = assetKey.replace(/\.svg$/i, '').trim();
  return ASSET_ICON_MAP[normalized] ?? 'ellipse-outline';
}
