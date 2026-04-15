import { supabase } from '@shared/api';
import type {
  Employee,
  EmployeeInsert,
  EmployeeListParams,
  EmployeeProfile,
  EmployeeUpdate,
} from '../model/types';

export async function fetchEmployees(
  params: EmployeeListParams
): Promise<{ data: Employee[]; count: number }> {
  const { page, pageSize, search, isActive } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const q = (search ?? '').trim();

  // When searching, use !inner join so ilike on profiles.full_name filters rows
  // When not searching, use LEFT JOIN to also show employees without a linked profile
  const selectClause = q
    ? '*, profiles!inner(id, full_name, email, phone)'
    : '*, profiles(id, full_name, email, phone)';

  let query = supabase
    .from('employees')
    .select(selectClause, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (q) {
    query = query.ilike('profiles.full_name', `%${q}%`);
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: (data ?? []) as Employee[], count: count ?? 0 };
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .select('*, profiles(id, full_name, email, phone)')
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as Employee;
}

export async function fetchProfiles(): Promise<EmployeeProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .order('full_name', { ascending: true })
    .limit(1000);

  if (error) throw error;

  return (data ?? []) as EmployeeProfile[];
}

export async function fetchEmployeeRole(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.role_id ?? null;
}

export async function createEmployee(input: EmployeeInsert): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert(input)
    .select('*, profiles(id, full_name, email, phone)')
    .single();

  if (error) throw error;

  return data as Employee;
}

export async function updateEmployee(
  id: string,
  input: EmployeeUpdate
): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(input)
    .eq('id', id)
    .select('*, profiles(id, full_name, email, phone)')
    .single();

  if (error) throw error;

  return data as Employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id);

  if (error) throw error;
}

export async function assignEmployeeRole(
  userId: string,
  roleId: string | null
): Promise<void> {
  // Delete existing role assignments for this user first
  const { error: deleteError } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  if (deleteError) throw deleteError;

  // Insert new role if provided
  if (roleId) {
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role_id: roleId });

    if (insertError) throw insertError;
  }
}
