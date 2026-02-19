'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { SkillLevel } from '@/lib/types';

// ── Toggle skill level ────────────────────────────────────────────────────────

export async function toggleSkillLevel(playerId: string, currentLevel: SkillLevel) {
  const supabase = await createClient();
  const newLevel: SkillLevel = currentLevel === 'advanced' ? 'beginner' : 'advanced';

  const { error } = await supabase
    .from('players')
    .update({ skill_level: newLevel, updated_at: new Date().toISOString() })
    .eq('id', playerId);

  if (error) {
    throw new Error(`Failed to update skill level: ${error.message}`);
  }

  revalidatePath('/dashboard/roster');
}

// ── Toggle active/inactive ────────────────────────────────────────────────────

export async function togglePlayerActive(playerId: string, currentlyActive: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('players')
    .update({ is_active: !currentlyActive, updated_at: new Date().toISOString() })
    .eq('id', playerId);

  if (error) {
    throw new Error(`Failed to update player status: ${error.message}`);
  }

  revalidatePath('/dashboard/roster');
}

// ── Add new player ────────────────────────────────────────────────────────────

export async function addPlayer(formData: FormData) {
  const supabase = await createClient();

  const name = (formData.get('name') as string | null)?.trim();
  const skill_level = formData.get('skill_level') as SkillLevel | null;

  if (!name || name.length < 1) {
    throw new Error('Player name is required.');
  }
  if (skill_level !== 'advanced' && skill_level !== 'beginner') {
    throw new Error('Skill level must be advanced or beginner.');
  }

  const { error } = await supabase.from('players').insert({
    name,
    skill_level,
    is_active: true,
  });

  if (error) {
    throw new Error(`Failed to add player: ${error.message}`);
  }

  revalidatePath('/dashboard/roster');
}
