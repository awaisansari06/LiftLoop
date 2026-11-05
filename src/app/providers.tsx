'use client';
import dynamic from 'next/dynamic';
const Shell=dynamic(()=>import('@/components/AppShell'),{ssr:false});
export default function Providers({children}:{children:React.ReactNode}){return <Shell>{children}</Shell>;}