import React, { useImperativeHandle, useRef } from 'react';
import { findNodeHandle, requireNativeComponent, UIManager, type TextInput, type TextInputProps, type ViewProps, type NativeSyntheticEvent } from 'react-native';

type Props = ViewProps & {
  value?: string; placeholder?: string;
  onPasswordChange?: (event: NativeSyntheticEvent<{ text: string }>) => void;
  onPasswordSubmit?: () => void; onPasswordFocus?: () => void; onPasswordBlur?: () => void;
};
const SecureField = requireNativeComponent<Props>('B4SecureField');
type Handler<K extends 'onSubmitEditing' | 'onFocus' | 'onBlur'> = NonNullable<TextInputProps[K]>;
/** AppKit sends no RN event payload; callers only read `nativeEvent.text`, if anything. */
const synthetic = <K extends 'onSubmitEditing' | 'onFocus' | 'onBlur'>(nativeEvent: object) =>
  ({ nativeEvent } as unknown as Parameters<Handler<K>>[0]);

/** A real AppKit secure field; RN macOS's secure cell replaces a plain NSTextField editor. */
export const PasswordInput = React.forwardRef<TextInput, TextInputProps>(function SecurePasswordField(props, ref) {
  const field = useRef<React.ComponentRef<typeof SecureField>>(null);
  useImperativeHandle(ref, () => ({ focus() {
    const tag = findNodeHandle(field.current);
    if (tag != null) UIManager.dispatchViewManagerCommand(tag, 'focus', []);
  } }) as TextInput);
  return <SecureField ref={field} value={props.value} placeholder={props.placeholder}
    accessibilityLabel={props.accessibilityLabel} style={props.style} testID={props.testID}
    onPasswordChange={event => props.onChangeText?.(event.nativeEvent.text)}
    onPasswordSubmit={() => props.onSubmitEditing?.(synthetic<'onSubmitEditing'>({ text: props.value ?? '' }))}
    onPasswordFocus={() => props.onFocus?.(synthetic<'onFocus'>({}))}
    onPasswordBlur={() => props.onBlur?.(synthetic<'onBlur'>({}))} />;
});
PasswordInput.displayName = 'PasswordInput';
