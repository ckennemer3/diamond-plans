import { createClient } from '@/lib/supabase/server';
import type { Player, SkillLevel } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import {
  toggleSkillLevel,
  togglePlayerActive,
  addPlayer,
} from '@/lib/actions/update-roster';

// ── Skill toggle button (client interaction via server action) ────────────────

function SkillToggleButton({
  playerId,
  currentLevel,
}: {
  playerId: string;
  currentLevel: SkillLevel;
}) {
  return (
    <form
      action={async () => {
        'use server';
        await toggleSkillLevel(playerId, currentLevel);
      }}
    >
      <button
        type="submit"
        className="focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2 rounded-full"
        aria-label={`Toggle skill level for player (currently ${currentLevel})`}
      >
        <Badge variant={currentLevel === 'advanced' ? 'advanced' : 'beginner'}>
          {currentLevel === 'advanced' ? 'Advanced' : 'Beginner'}
        </Badge>
      </button>
    </form>
  );
}

// ── Active toggle button ──────────────────────────────────────────────────────

function ActiveToggleButton({
  playerId,
  isActive,
}: {
  playerId: string;
  isActive: boolean;
}) {
  return (
    <form
      action={async () => {
        'use server';
        await togglePlayerActive(playerId, isActive);
      }}
    >
      <button
        type="submit"
        className={[
          'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors min-h-[36px]',
          isActive
            ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
            : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100',
        ].join(' ')}
        aria-label={isActive ? 'Deactivate player' : 'Reactivate player'}
      >
        {isActive ? 'Deactivate' : 'Reactivate'}
      </button>
    </form>
  );
}

// ── Add player form ───────────────────────────────────────────────────────────

function AddPlayerForm() {
  return (
    <form action={addPlayer} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <h2 className="font-bold text-[#1e3a5f] text-base">Add New Player</h2>
      <div>
        <label
          htmlFor="player-name"
          className="block text-sm font-semibold text-[#1e3a5f] mb-1"
        >
          Name
        </label>
        <input
          id="player-name"
          name="name"
          type="text"
          required
          placeholder="Player name"
          className="w-full rounded-xl border border-gray-300 px-4 text-base outline-none transition focus:ring-2 focus:ring-[#1e3a5f]"
          style={{ minHeight: '48px' }}
          autoComplete="off"
        />
      </div>
      <div>
        <label
          htmlFor="player-skill"
          className="block text-sm font-semibold text-[#1e3a5f] mb-1"
        >
          Skill Level
        </label>
        <select
          id="player-skill"
          name="skill_level"
          required
          className="w-full rounded-xl border border-gray-300 px-4 text-base outline-none transition focus:ring-2 focus:ring-[#1e3a5f] bg-white"
          style={{ minHeight: '48px' }}
        >
          <option value="beginner">Beginner</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full rounded-xl font-semibold text-white text-base transition active:opacity-90"
        style={{ backgroundColor: '#1e3a5f', minHeight: '48px' }}
      >
        Add Player
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RosterPage() {
  const supabase = await createClient();

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('name', { ascending: true })
    .returns<Player[]>();

  const activePlayers = players?.filter((p) => p.is_active) ?? [];
  const inactivePlayers = players?.filter((p) => !p.is_active) ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Roster</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {activePlayers.length} active player{activePlayers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Add player form */}
      <AddPlayerForm />

      {/* Active players */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
          Active ({activePlayers.length})
        </h2>

        {activePlayers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-500 text-center">
            No active players yet. Add your first player above.
          </div>
        ) : (
          <div className="space-y-2">
            {activePlayers.map((player) => (
              <div
                key={player.id}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
              >
                {/* Avatar circle */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: '#1e3a5f' }}
                  aria-hidden="true"
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1e3a5f] truncate">{player.name}</p>
                </div>

                {/* Skill toggle */}
                <SkillToggleButton
                  playerId={player.id}
                  currentLevel={player.skill_level}
                />

                {/* Deactivate */}
                <ActiveToggleButton playerId={player.id} isActive={player.is_active} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive players */}
      {inactivePlayers.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Inactive ({inactivePlayers.length})
          </h2>
          <div className="space-y-2">
            {inactivePlayers.map((player) => (
              <div
                key={player.id}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 opacity-60"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 bg-gray-400"
                  aria-hidden="true"
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-500 truncate line-through">
                    {player.name}
                  </p>
                </div>

                <Badge variant="default">Inactive</Badge>

                <ActiveToggleButton playerId={player.id} isActive={player.is_active} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
