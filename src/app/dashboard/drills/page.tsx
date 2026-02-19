import { createClient } from '@/lib/supabase/server';
import type { Drill } from '@/lib/types';
import DrillLibraryClient from './DrillLibraryClient';

export default async function DrillLibraryPage() {
  const supabase = await createClient();

  const { data: drills } = await supabase
    .from('drills')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })
    .returns<Drill[]>();

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Drill Library</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {drills?.length ?? 0} drill{(drills?.length ?? 0) !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Client-side filtering + list */}
      <DrillLibraryClient drills={drills ?? []} />
    </div>
  );
}
