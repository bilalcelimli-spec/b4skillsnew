import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({send:vi.fn(),destroy:vi.fn()}));
vi.mock('@aws-sdk/client-s3',()=>{
 class Command {input:any;constructor(input:any){this.input=input;}}
 return {S3Client:class{send=mocks.send;destroy=mocks.destroy;},DeleteObjectCommand:class extends Command{},
 GetBucketVersioningCommand:class extends Command{},ListObjectVersionsCommand:class extends Command{},
 DeleteObjectsCommand:class extends Command{},HeadObjectCommand:class extends Command{}};
});
import {deletePrivateObject} from '../private-storage';
describe('S3 erasure confirmation',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.send.mockReset();});
 const ref={provider:'s3' as const,bucket:'owned',key:'session/photo.jpg'};
 const absent=()=>Promise.reject({name:'NotFound',$metadata:{httpStatusCode:404}});
 it('purges versions and delete markers of only the exact key and verifies absence',async()=>{
  mocks.send.mockResolvedValueOnce({Status:'Enabled'}).mockResolvedValueOnce({Versions:[{Key:ref.key,VersionId:'v1'},{Key:ref.key+'.other',VersionId:'other'}],DeleteMarkers:[{Key:ref.key,VersionId:'marker'}]})
    .mockResolvedValueOnce({}).mockResolvedValueOnce({Versions:[]}).mockImplementationOnce(absent);
  await deletePrivateObject(ref);
  expect(mocks.send.mock.calls[2][0].input.Delete.Objects).toEqual([{Key:ref.key,VersionId:'v1'},{Key:ref.key,VersionId:'marker'}]);
  expect(mocks.destroy).toHaveBeenCalledOnce();
 });
 it('does not report success on permission or Object Lock failures',async()=>{
  mocks.send.mockResolvedValueOnce({Status:'Enabled'}).mockResolvedValueOnce({Versions:[{Key:ref.key,VersionId:'v1'}]})
    .mockResolvedValueOnce({Errors:[{Code:'AccessDenied'}]});
  await expect(deletePrivateObject(ref)).rejects.toThrow('incomplete');
 });
 it('does not report success while an unversioned object is still readable',async()=>{
  mocks.send.mockResolvedValue({});
  await expect(deletePrivateObject(ref)).rejects.toThrow('still readable');
 });
 it('retries idempotently when an unversioned object is already absent',async()=>{
  mocks.send.mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockImplementationOnce(absent);
  await expect(deletePrivateObject(ref)).resolves.toBeUndefined();
 });
});
