import {createClient} from '@supabase/supabase-js';
export function simulationEnabled(){return process.env.NODE_ENV==='development' && process.env.PAYMENT_MODE==='simulated';}
export function simulationDatabase(request:Request){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:request.headers.get('authorization')||''}}});}
