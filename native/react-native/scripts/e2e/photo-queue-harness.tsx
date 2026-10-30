// Separate ENTRY_FILE for disposable QA copies only. Never imported by index.js.
// Synthetic pixels, existing QA cookies/session, no credentials or camera access.
import React, { useEffect, useState } from 'react';
import { AppRegistry, Platform, Text, View } from 'react-native';
import { Backend } from '../../src/api';
import { B4Native } from '../../src/native';
import { PhotoQueue } from '../../src/proctoring/photoQueue';
const fixture = {"base64":"/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDIBCQkJDAsMGA0NGDIhHCEyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMv/AABEIAAIAAgMBEQACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AOIr2Dyz/9k=","bytes":614,"sha256":"4378a52871014c3f4bbf68fd569b264997aba1a7d51907bce1c6db8e6f00f75b"};
function PhotoQueueHarness() {
  const [message, setMessage] = useState('NATIVE PHOTO QUEUE QA — preparing synthetic fixture');
  useEffect(() => { void (async () => {
    if (!__DEV__) throw new Error('Debug QA only');
    const backend = new Backend('http://127.0.0.1:3004');
    const candidate = await backend.me();
    if (candidate.organizationId !== 'cmvlj3ynd0000uvuo9q6p5urh') throw new Error('QA tenant required');
    const sessionId = await B4Native.getPref(`session.${backend.baseUrl}.${candidate.uid}`);
    if (!sessionId || !['cmvm5fgr40009uvlg24k2gf4r','cmvm5tipc000duvlgq9polv6o'].includes(sessionId)) throw new Error('Known QA session required');
    const status = await backend.status(sessionId);
    if (status.status !== 'IN_PROGRESS') throw new Error('Active QA session required');
    const scope = `photo.${backend.baseUrl}.${candidate.uid}`;
    const queue = new PhotoQueue({read: () => B4Native.photoRead(scope), write: value => B4Native.photoWrite(scope, value)}, async () => {throw new Error('QA synthetic offline transport');});
    if ((await queue.status()).length !== 0) throw new Error('Existing photos preserved; fixture aborted');
    await queue.checkStorage();
    const evidenceId = await B4Native.newRequestId();
    await queue.append({...fixture,faceCount:1,capturedAt:new Date().toISOString(),evidenceId,sessionId,platform:Platform.OS === 'macos' ? 'macos' : 'ipad'});
    try { await queue.flush(); } catch (error) { if (!(error instanceof Error) || error.message !== 'QA synthetic offline transport') throw error; }
    if ((await queue.status()).length !== 1) throw new Error('Fixture not retained');
    await B4Native.setPrefAsync('photoHarnessProof', JSON.stringify({evidenceId,sessionId,uid:candidate.uid,platform:Platform.OS,sha256:fixture.sha256,phase:'persisted-offline',at:new Date().toISOString()}));
    setMessage('NATIVE PHOTO QUEUE QA — SYNTHETIC FIXTURE ENCRYPTED; OFFLINE RETRY RETAINED; READY FOR NORMAL APP RESTART\n'+evidenceId);
  })().catch(error => setMessage('QA FAILED: '+String(error))); }, []);
  return <View style={{padding:40,backgroundColor:'#fff',flex:1}}><Text style={{fontSize:22,color:'#102030'}} accessibilityLabel={message}>{message}</Text></View>;
}
AppRegistry.registerComponent('B4Skills', () => PhotoQueueHarness);
