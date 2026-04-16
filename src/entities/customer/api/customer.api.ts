import { supabase } from '@shared/api';
import type {
  Customer,
  CustomerInsert,
  CustomerListParams,
  CustomerUpdate,
} from '../model/types';

export async function fetchCustomers(
  params: CustomerListParams,
): Promise<{ data: Customer[]; count: number }> {
  const { page, pageSize, search } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('full_name', { ascending: true });

  const q = (search ?? '').trim();
  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,phone_number.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: (data ?? []) as Customer[], count: count ?? 0 };
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as Customer;
}

export async function createCustomer(input: CustomerInsert): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert(input)
    .select()
    .single();

  if (error) throw error;

  return data as Customer;
}

export async function updateCustomer(
  id: string,
  input: CustomerUpdate,
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as Customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id);

  if (error) throw error;
}
