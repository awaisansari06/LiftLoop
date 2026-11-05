import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.local');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
for(const name of ['profile-photos','driver-documents','attachments']){
 const {error}=await db.storage.createBucket(name,{public:false,fileSizeLimit:10485760,allowedMimeTypes:['image/jpeg','image/png','image/webp','application/pdf']});
 console.log(name,error?error.message:'created private bucket');
}
