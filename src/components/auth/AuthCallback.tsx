import { useEffect } from 'react';
import { useNavigate } from '@/lib/navigation';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../hooks/useStore';
import { createOrUpdateProfile, isAdminEmail } from '../../lib/auth';
import { dashboardPath } from '../../lib/roles';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate('/');
          return;
        }

        const authUser = session.user;
        const email = authUser.email || '';
        const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null;
        const avatar = authUser.user_metadata?.avatar_url || null;

        // Check stored role preference — Login.tsx stores under 'selectedRole'
        const storedRole = (localStorage.getItem('selectedRole') || localStorage.getItem('liftloop_role')) as 'student' | 'driver' | 'admin' | 'both' | null;
        
        let role: string = storedRole || 'student';
        
        // Admin approval check
        if (role === 'admin') {
          if (!isAdminEmail(email)) {
            role = 'pending_admin';
          }
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (existingUser) {
          // Always sync profile photo and role from latest login if different
          const updates: Record<string, any> = {};
          if (avatar && existingUser.profile_photo !== avatar) updates.profile_photo = avatar;
          
          // If existing user is admin and they chose admin again, don't overwrite with pending
          if (role === 'admin' && !existingUser.admin_approved && !isAdminEmail(email)) {
            role = 'pending_admin';
          } else if (existingUser.user_type === 'admin' && existingUser.admin_approved && role === 'admin') {
             role = 'admin';
          }

          if (storedRole && existingUser.user_type !== role) updates.user_type = role;
          if (fullName && !existingUser.full_name) updates.full_name = fullName;

          let finalUser = existingUser;
          if (Object.keys(updates).length > 0) {
            const { data: updated } = await supabase.from('users').update(updates).eq('id', authUser.id).select().single();
            if (updated) finalUser = updated;
          }

          setUser(finalUser);
          navigate(dashboardPath(finalUser.user_type));
        } else {
          // Create new profile
          const profile = await createOrUpdateProfile(authUser.id, email, fullName, role);
          if (avatar) {
            await supabase.from('users').update({ profile_photo: avatar }).eq('id', authUser.id);
            profile.profile_photo = avatar;
          }
          setUser(profile);
          navigate(dashboardPath(profile.user_type));
        }

        localStorage.removeItem('selectedRole');
        localStorage.removeItem('liftloop_role');
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate, setUser, setLoading]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #15382E 0%, #0A1128 60%, #050914 100%)',
      color: 'white', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", position: 'relative', overflow: 'hidden',
    }}>
      <div className="aurora-wrap">
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="noise-overlay" />
      </div>
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 24px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,149,108,0.35), transparent 70%)', filter: 'blur(20px)' }} />
          <div style={{ position: 'absolute', inset: 8, border: '3px solid rgba(200,149,108,0.15)', borderTopColor: '#B8E568', borderRadius: '50%', animation: 'spin-slow 0.9s linear infinite' }} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}>Signing you in…</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>Preparing your portal</p>
      </div>
    </div>
  );
}
