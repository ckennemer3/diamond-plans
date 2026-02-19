import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

// ── SVG icons inline (no extra deps needed) ──────────────────────────────────

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function DrillsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l3 3" />
    </svg>
  );
}

function RosterIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ── Nav items config ──────────────────────────────────────────────────────────

const navItems = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarIcon },
  { href: '/dashboard/drills', label: 'Drills', icon: DrillsIcon },
  { href: '/dashboard/roster', label: 'Roster', icon: RosterIcon },
];

// ── Layout ────────────────────────────────────────────────────────────────────

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Verify the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>();

  // assistant_coach should use the /coach route (not the head coach dashboard)
  if (profile?.role === 'assistant_coach') {
    redirect('/coach');
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Top header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 shadow-sm"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        <div className="flex items-center gap-2">
          {/* Diamond icon */}
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect
              x="16"
              y="3"
              width="18"
              height="18"
              rx="2"
              transform="rotate(45 16 3)"
              fill="#f97316"
            />
          </svg>
          <span className="text-white font-bold text-lg tracking-tight">Diamond Plans</span>
        </div>
        {profile && (
          <span className="text-[#a8c4e0] text-sm font-medium truncate max-w-[140px]">
            {profile.full_name}
          </span>
        )}
      </header>

      {/* Main content — bottom padding for the nav bar */}
      <main className="flex-1 pb-20 px-4 py-4 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white"
        aria-label="Main navigation"
      >
        <ul className="flex items-stretch">
          {navItems.map(({ href, label, icon: Icon }) => (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[#1e3a5f] hover:text-[#f97316] transition-colors"
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
