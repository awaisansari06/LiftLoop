'use client';
import dynamic from 'next/dynamic';
import {ProtectedRoute, PublicOnly} from '@/components/RouteGuard';
const Screen = dynamic(() => import('@/screens/BookRide'), {ssr:false, loading: () => <p role="status">Loading LiftLoop…</p>});
export default function Page(){return <Screen />;}
