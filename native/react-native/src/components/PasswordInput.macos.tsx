import React, { useImperativeHandle, useRef } from 'react';
import { findNodeHandle, requireNativeComponent, UIManager, type TextInput, type TextInputProps, type ViewProps, type NativeSyntheticEvent } from 'react-native';

type Props = ViewProps & {
  value?: string; placeholder?: string;
  onPasswordChange?: (event: NativeSyntheticEvent<{ text: string }>) => void;
  onPasswordSubmit?: () => void; onPasswordFocus?: () => void; onPasswordBlur?: () => void;
};
const SecureField = requireNativeComponent<Props>('B4SecureField');

/** A real AppKit secure field; RN macOS's secure cell replaces a plain NSTextField editor. */
export const PasswordInput = React.forwardRef<TextInput, TextInputProps>(function PasswordInput(props, ref) {
  const field = useRef<any>(null);
  useImperativeHandle(ref, () => ({ focus() {
    const tag = findNodeHandle(field.current);
    if (tag != null) UIManager.dispatchViewManagerCommand(tag, 'focus', []);
  } }) as TextInput);
  return <SecureField ref={field} value={props.value} placeholder={props.placeholder}
    accessibilityLabel={props.accessibilityLabel} style={props.style} testID={props.testID}
    onPasswordChange={event => props.onChangeText?.(event.nativeEvent.text)}
    onPasswordSubmit={() => props.onSubmitEditing?.({ nativeEvent: { text: props.value ?? '' } } as any)}
    onPasswordFocus={() => props.onFocus?.({ nativeEvent: {} } as any)}
    onPasswordBlur={() => props.onBlur?.({ nativeEvent: {} } as any)} />;
});
