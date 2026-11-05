'use client';
import NextLink from 'next/link';
import { useRouter, usePathname, useSearchParams as useNextSearchParams, useParams as useNextParams } from 'next/navigation';
import { useEffect, type ComponentProps } from 'react';
export function Link({to, replace, ...props}: Omit<ComponentProps<typeof NextLink>, 'href'> & {to: string; replace?: boolean}) { return <NextLink href={to} replace={replace} {...props} />; }
export function useNavigate() { const router=useRouter(); return (to: string | number, options?: {replace?: boolean}) => { if(typeof to === 'number') { if(to === -1) router.back(); else if(to === 1) router.forward(); else window.history.go(to); } else if(options?.replace) router.replace(to); else router.push(to); }; }
export function useLocation() { const pathname=usePathname(); const search=useNextSearchParams().toString(); return {pathname, search: search ? '?' + search : '', hash: typeof window === 'undefined' ? '' : window.location.hash}; }
export function useSearchParams() { return [useNextSearchParams()] as const; }
export function useParams<T extends Record<string,string>>() { return useNextParams<T>(); }
export function Navigate({to, replace = false}: {to: string; replace?: boolean}) { const router=useRouter(); useEffect(()=>{if(replace) router.replace(to); else router.push(to);},[router,to,replace]); return null; }
