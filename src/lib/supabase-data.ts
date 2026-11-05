import { supabase } from './supabase';
import type { AppState } from '../types';

export async function loadCloudState(userId: string): Promise<AppState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('brujula_states')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.state as AppState | undefined) ?? null;
}

export async function saveCloudState(userId: string, state: AppState): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('brujula_states')
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function deleteCloudState(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('brujula_states').delete().eq('user_id', userId);
  if (error) throw error;
}
