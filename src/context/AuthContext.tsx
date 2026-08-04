import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';
import { looksLikePhone, parseE164, validatePhone } from '../lib/phone';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** ISSUE 4: signup captures BOTH an email and a mobile number. */
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phoneE164: string
  ) => Promise<{ error: string | null }>;
  /** ISSUE 4: `identifier` may be an email address OR a phone number. */
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Edits the stored contact details from the profile page. */
  updateContact: (next: { email?: string; phoneE164?: string; fullName?: string }) => Promise<{ error: string | null }>;
  /** Contact details, resolved from auth metadata with the profile row as backup. */
  contact: { email: string; phone: string; fullName: string };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  // Phone lives in user_metadata because Supabase accounts are created with an email
  // identity; the profiles row is used as a fallback for accounts created earlier.
  const contact = {
    email: user?.email || '',
    phone:
      (user?.user_metadata?.phone as string | undefined) ||
      user?.phone ||
      ((profile as unknown as { phone?: string } | null)?.phone ?? ''),
    fullName:
      (user?.user_metadata?.full_name as string | undefined) || profile?.full_name || '',
  };

  const signUp = async (email: string, password: string, fullName: string, phoneE164: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone: phoneE164 } },
    });
    if (error) return { error: error.message };

    // Best-effort: mirror both contact fields onto the profile row. The column may not
    // exist on older deployments, so a failure here must not block signup.
    if (data.user) {
      await supabase
        .from('profiles')
        .upsert({ id: data.user.id, email, full_name: fullName, phone: phoneE164 })
        .then(undefined, () => {
          /* profiles table/column optional */
        });
    }
    return { error: null };
  };

  const signIn = async (identifier: string, password: string) => {
    const value = (identifier || '').trim();

    if (looksLikePhone(value)) {
      const { dial, national } = parseE164(value);
      const check = validatePhone(dial, national);
      if (!check.valid) {
        return { error: 'Enter a valid mobile number with country code, or use your email address.' };
      }
      const { error } = await supabase.auth.signInWithPassword({ phone: check.e164, password });
      return { error: error?.message ?? null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email: value, password });
    return { error: error?.message ?? null };
  };

  const updateContact = async (next: { email?: string; phoneE164?: string; fullName?: string }) => {
    const payload: Parameters<typeof supabase.auth.updateUser>[0] = { data: {} };
    if (next.email) payload.email = next.email;

    const data: Record<string, unknown> = { ...(user?.user_metadata || {}) };
    if (next.phoneE164 !== undefined) data.phone = next.phoneE164;
    if (next.fullName !== undefined) data.full_name = next.fullName;
    payload.data = data;

    const { error } = await supabase.auth.updateUser(payload);
    if (error) return { error: error.message };

    if (user) {
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: next.email ?? contact.email,
          full_name: next.fullName ?? contact.fullName,
          phone: next.phoneE164 ?? contact.phone,
        })
        .then(undefined, () => {
          /* profiles table/column optional */
        });
      await fetchProfile(user.id);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateContact,
        contact,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
