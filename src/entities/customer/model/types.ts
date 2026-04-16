export interface Customer {
  id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  date_of_birth: string | null; // ISO date string
  gender: string | null; // 'male' | 'female' | 'other' | null
  id_card_number: string | null;
  address: string | null;
  loyalty_points: number; // read-only, no UI in this phase
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInsert = Omit<
  Customer,
  'id' | 'created_at' | 'updated_at'
>;
export type CustomerUpdate = Partial<CustomerInsert>;

export interface CustomerListParams {
  page: number;
  pageSize: number;
  search?: string; // ilike on full_name, phone_number, or email via .or()
}
