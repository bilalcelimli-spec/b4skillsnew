import React from 'react';
import { TextInput } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Backend, blankTask, completeBlanks, responseMode, canRender, type AssessmentItem } from '../src/api';
import { ItemScreen } from '../src/screens/ItemScreen';
import { Button } from '../src/components/ui';
jest.mock('../src/components/Icon', () => ({ Icon: () => null }));
jest.mock('../src/native', () => ({B4Native: {stopPlayback: jest.fn()}, nativeEvents:{addListener:jest.fn(()=>({remove:jest.fn()}))}}));
const item: AssessmentItem={id:'fib',type:'FILL_IN_BLANKS',skill:'LISTENING',metadata:{prompt:'First ___1___, second ___[2]___.',audioUrl:'/real.m4a'}};
it('normalizes numbered markers and derives all ordered gaps',()=>{
 expect(responseMode(item)).toBe('blanks');expect(canRender(item)).toBe(true);
 expect(blankTask(item)).toMatchObject({count:2,scaffold:'First ___, second ___.'});
 expect(blankTask({...item,metadata:{prompt:'Listen',blanks:[{},{},{}]}}).count).toBe(3);
 expect(blankTask({...item,metadata:{prompt:'Cycling: ___, ___, ___, ___, ___.'}}).count).toBe(5);
});
it('uses word-bank text and rejects partial or delimiter-bearing answers',()=>{
 expect(blankTask({...item,metadata:{prompt:'___',wordBank:['red','blue'],options:['green']}}).choices).toEqual(['red','blue']);
 expect(completeBlanks(['red','  '],2)).toBe(false);expect(completeBlanks(['red|blue','green'],2)).toBe(false);expect(completeBlanks(['red','blue'],2)).toBe(true);
});
it('sends ordered text including multi-word answers through the API contract',async()=>{
 globalThis.fetch=jest.fn(async()=>({ok:true,status:200,text:async()=>'{"success":true}'})) as any;
 await new Backend('http://localhost:3004').respond('s','fib',{kind:'blanks',answers:[' red ','water bottle']},100);
 expect(JSON.parse((globalThis.fetch as jest.Mock).mock.calls[0][1].body).value).toBe('red|water bottle');
});
it('does not send incomplete or ambiguous blank payloads',async()=>{
 globalThis.fetch=jest.fn();
 const api=new Backend('http://localhost:3004');
 await expect(api.respond('s','fib',{kind:'blanks',answers:['red','']},100)).rejects.toThrow(/Her boşluğu/);
 await expect(api.respond('s','fib',{kind:'blanks',answers:['red|blue']},100)).rejects.toThrow(/Her boşluğu/);
 expect(globalThis.fetch).not.toHaveBeenCalled();
});
it('requires every field and preserves the ordered draft on re-render',async()=>{
 const store:any={progress:{progress:43,maxItems:53},mediaUrl:()=>null,submit:jest.fn(),busy:false};let tree!:ReactTestRenderer;
 await act(async()=>{tree=create(<ItemScreen item={item} store={store} recorder={{recording:false} as any} wide={false}/>);});
 const send=()=>tree.root.findAllByType(Button).find(b=>b.props.label==='Yanıtı gönder')!;
 expect(send().props.disabled).toBe(true);act(()=>tree.root.findAllByType(TextInput)[0].props.onChangeText('red'));expect(send().props.disabled).toBe(true);
 act(()=>tree.root.findAllByType(TextInput)[1].props.onChangeText('water bottle'));
 await act(async()=>{tree.update(<ItemScreen item={item} store={{...store,busy:true}} recorder={{recording:false} as any} wide={false}/>);});
 expect(tree.root.findAllByType(TextInput).map(n=>n.props.value)).toEqual(['red','water bottle']);expect(send().props.disabled).toBe(false);
 act(()=>send().props.onPress());expect(store.submit).toHaveBeenCalledWith({kind:'blanks',answers:['red','water bottle']});await act(async()=>tree.unmount());
});
it('keeps a separate word-bank choice for every gap and submits text rather than indices',async()=>{
 const store:any={mediaUrl:()=>null,submit:jest.fn(),busy:false};let tree!:ReactTestRenderer;
 const bankItem={...item,metadata:{prompt:'___ then ___',wordBank:['red','blue'],audioUrl:'/real.m4a'}};
 await act(async()=>{tree=create(<ItemScreen item={bankItem} store={store} recorder={{recording:false} as any} wide={false}/>);});
 const choices=(label:string)=>tree.root.findAll(n=>n.props.accessibilityLabel===label && typeof n.props.onPress==='function');
 act(()=>choices('A. red')[0].props.onPress());
 act(()=>{const blue=choices('B. blue');blue[blue.length-1].props.onPress();});
 const send=tree.root.findAllByType(Button).find(b=>b.props.label==='Yanıtı gönder')!;
 expect(send.props.disabled).toBe(false);act(()=>send.props.onPress());
 expect(store.submit).toHaveBeenCalledWith({kind:'blanks',answers:['red','blue']});await act(async()=>tree.unmount());
});
