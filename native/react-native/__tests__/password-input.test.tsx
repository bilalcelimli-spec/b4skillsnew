import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { PasswordInput } from '../src/components/PasswordInput.macos';

it('forwards AppKit secure-field edits and submit without rendering the password as text', async () => {
 const changed=jest.fn(), submitted=jest.fn();let tree!:ReactTestRenderer;
 await act(async()=>{tree=create(<PasswordInput value="qa-secret" accessibilityLabel="Şifre" onChangeText={changed} onSubmitEditing={submitted}/>);});
 const native=tree.root.find(n=>n.props.onPasswordChange && n.props.onPasswordSubmit);
 act(()=>native.props.onPasswordChange({nativeEvent:{text:'updated-qa-secret'}}));
 expect(changed).toHaveBeenCalledWith('updated-qa-secret');
 act(()=>native.props.onPasswordSubmit());expect(submitted).toHaveBeenCalledTimes(1);
 expect(tree.root.findAllByType(Text)).toHaveLength(0);
 await act(async()=>tree.unmount());
});
