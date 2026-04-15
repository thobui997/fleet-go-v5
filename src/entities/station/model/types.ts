export interface Station {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type StationInsert = Omit<Station, 'id' | 'created_at' | 'updated_at'>;

export type StationUpdate = Partial<StationInsert>;

export interface StationListParams {
  page: number;
  pageSize: number;
  search?: string;    // ilike on name OR city via .or()
  isActive?: boolean; // undefined = no filter
}
