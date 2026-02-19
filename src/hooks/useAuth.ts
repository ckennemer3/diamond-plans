'use client';

// ============================================
// useAuth — Supabase auth state + coach profile
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

export interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // Fetch the profile row for a given user id
  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, email, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('[useAuth] Failed to fetch profile:', error.message);
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }
    },
    [supabase],
  );

  useEffect(() => {
    let mounted = true;

    // Hydrate with the existing session on mount
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (!mounted) return;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Subscribe to future auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        fetchProfile(nextUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // fetchProfile is stable (useCallback with supabase dep), supabase instance is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  return { user, profile, loading, signOut };
}
