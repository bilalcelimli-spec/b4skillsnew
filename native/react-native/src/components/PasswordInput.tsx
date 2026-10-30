import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
export const PasswordInput = React.forwardRef<TextInput, TextInputProps>((props, ref) => <TextInput {...props} ref={ref} secureTextEntry />);
