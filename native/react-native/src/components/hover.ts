import { useState } from 'react';
import { Platform } from 'react-native';

/**
 * Pointer-hover state for Pressables, on macOS only. On iPad a tap first delivers a hover event;
 * re-rendering on it swallowed the first tap of every button, so iOS gets no hover handlers.
 */
export function useHover() {
  const [hovered, setHovered] = useState(false);
  const props = Platform.OS === 'macos'
    ? { onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false) }
    : {};
  return [hovered, props] as const;
}

/**
 * Pointer cursor style, macOS only. On iPadOS `cursor` installs a pointer interaction that
 * swallowed every other tap on the simulator, so iOS gets none.
 */
export const pointerCursor = Platform.OS === 'macos' ? ({ cursor: 'pointer' } as const) : null;
