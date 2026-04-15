export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export type RoleInsert = Omit<Role, 'id' | 'created_at' | 'updated_at'>;

export type RoleUpdate = Partial<RoleInsert>;

export interface RoleListParams {
  page: number;
  pageSize: number;
  search?: string;
}
