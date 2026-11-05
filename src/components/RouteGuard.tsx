'use client';
import { useAuthStore } from '@/hooks/useStore';
import { Navigate } from '@/lib/navigation';
import { KineticTextLoader } from '@/components/ui/kinetic-loader';
export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuthStore();
  if (loading) return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <KineticTextLoader text="Loading" className="scale-90 sm:scale-100" />
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  if (roles?.length && !(user.user_type && (roles.includes(user.user_type) || (user.user_type === 'both' && roles.some(role => role === 'student' || role === 'driver'))))) return <Navigate to="/" replace />;
  return <>{children}</>;
}


export function PublicOnly({children, dashboard = false}: {children: React.ReactNode; dashboard?: boolean}) { const {user} = useAuthStore(); return user ? <Navigate to={dashboard ? dashboardPath(user.user_type) : '/'} replace /> : children; }
import { dashboardPath } from '@/lib/roles';
