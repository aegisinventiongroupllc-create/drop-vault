import {it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({upload:vi.fn(),getSession:vi.fn(),start:vi.fn(),options:{} as any}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:()=>({upload:mocks.upload})},auth:{getSession:mocks.getSession}}}));
vi.mock('tus-js-client',()=>({Upload:class {constructor(_file:File,options:any){mocks.options=options;}findPreviousUploads(){return Promise.resolve([]);}start(){mocks.start();mocks.options.onSuccess();}abort(){return Promise.resolve();}}}));
import {uploadBrandedFile} from '@/lib/resumableUpload';
beforeEach(()=>{vi.clearAllMocks();mocks.getSession.mockResolvedValue({data:{session:{access_token:'test-token'}},error:null});});
it('large branded files use 6 MiB resumable chunks and no overwrite',async()=>{
 const result=await uploadBrandedFile('vault','owner/video.mp4',new File([new Uint8Array(7*1024*1024)],'video.mp4',{type:'video/mp4'}));
 expect(result.error).toBeNull();expect(mocks.start).toHaveBeenCalledOnce();expect(mocks.upload).not.toHaveBeenCalled();expect(mocks.options.chunkSize).toBe(6*1024*1024);expect(mocks.options.headers['x-upsert']).toBe('false');
});
it('cancelled uploads never start',async()=>{const controller=new AbortController();controller.abort();expect((await uploadBrandedFile('vault','owner/a.mp4',new File(['a'],'a.mp4'),undefined,controller.signal)).error?.message).toBe('Upload cancelled');expect(mocks.upload).not.toHaveBeenCalled();expect(mocks.start).not.toHaveBeenCalled();});
it('large uploads require an authenticated session',async()=>{mocks.getSession.mockResolvedValue({data:{session:null},error:null});expect((await uploadBrandedFile('vault','owner/a.mp4',new File([new Uint8Array(7*1024*1024)],'a.mp4'))).error?.message).toBe('Sign in to upload.');expect(mocks.start).not.toHaveBeenCalled();});
