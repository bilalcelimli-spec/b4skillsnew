import React from 'react';
import { Platform, ScrollView as NativeScrollView, ScrollViewProps } from 'react-native';
import { useLanguage } from './store';

// AppKit mirrors the document view of an RTL scroll viewport. Keep the viewport
// LTR and apply the language direction to its content so glyphs remain readable.
export const ScrollView = React.forwardRef<NativeScrollView, ScrollViewProps>(function ScrollView({ style, contentContainerStyle, ...props }, ref) {
  const { rtl } = useLanguage();
  return <NativeScrollView ref={ref} {...props}
    style={[style, Platform.OS === 'macos' && { direction: 'ltr' }]}
    contentContainerStyle={[contentContainerStyle, { direction: rtl ? 'rtl' : 'ltr' }]} />;
});
