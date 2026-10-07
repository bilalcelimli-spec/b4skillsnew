import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
it('refuses ephemeral certificate signing keys in production',async()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('CERT_SIGNING_KEY_PEM','');vi.resetModules();
 const {getPublicKeyPem}=await import('../src/lib/certificates/blockchain-cert');
 expect(()=>getPublicKeyPem()).toThrow('CERT_SIGNING_KEY_PEM is required');
});
