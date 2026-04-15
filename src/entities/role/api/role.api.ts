import { supabase } from '@shared/api';
import type { Role, RoleInsert, RoleListParams, RoleUpdate } from '../model/types';

export async function fetchRoles(
  params: RoleListParams
): Promise<{ data: Role[]; count: number }> {
  const { page, pageSize, search } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('roles')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('name', { ascending: true });

  const q = (search ?? '').trim();
  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: (data ?? []) as Role[], count: count ?? 0 };
}

export async function fetchRole(id: string): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as Role;
}

export async function createRole(input: RoleInsert): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .insert(input)
    .select()
    .single();

  if (error) throw error;

  return data as Role;
}

export async function updateRole(id: string, input: RoleUpdate): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as Role;
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', id);

  if (error) throw error;
}
