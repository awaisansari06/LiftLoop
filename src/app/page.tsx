'use client';
import dynamic from 'next/dynamic';
import {ProtectedRoute, PublicOnly} from '@/components/RouteGuard';
const Screen = dynamic(() => import('@/screens/Landing'), {ssr:false, loading: () => <p role="status">Loading LiftLoop…</p>});
export default function Page(){return <PublicOnly dashboard={true}><Screen /></PublicOnly>;}
