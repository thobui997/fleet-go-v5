export interface EmployeeProfile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
}

export interface Employee {
  id: string;
  user_id: string | null;
  hire_date: string | null;
  license_number: string | null;
  license_expiry: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles: EmployeeProfile | null; // joined via user_id FK
}

export type EmployeeInsert = {
  user_id?: string | null;
  hire_date?: string | null;
  license_number?: string | null;
  license_expiry?: string | null;
  is_active?: boolean;
};

export type EmployeeUpdate = Partial<EmployeeInsert>;

export interface EmployeeListParams {
  page: number;
  pageSize: number;
  search?: string; // ilike on profiles.full_name via !inner join
  isActive?: boolean; // undefined = no filter
}
