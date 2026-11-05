import type {Metadata} from 'next';
import {Suspense} from 'react';
import Providers from './providers';
import '../index.css';
export const metadata: Metadata={title:'LiftLoop — Campus Carpooling',description:'Share rides, save money, travel safely.',icons:{icon:'/favicon.svg'},manifest:'/manifest.json'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/></head><body><Suspense fallback={<p>Loading LiftLoop…</p>}><Providers>{children}</Providers></Suspense></body></html>;}