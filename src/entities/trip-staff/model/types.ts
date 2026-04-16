export type StaffRole = 'driver' | 'assistant';

export const STAFF_ROLES = ['driver', 'assistant'] as const satisfies readonly StaffRole[];

export interface TripStaff {
  trip_id: string;
  employee_id: string;
  role: StaffRole;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripStaffWithDetails extends TripStaff {
  employee: {
    id: string;
    profiles: {
      id: string;
      full_name: string | null;
    } | null;
  } | null;
}

export interface TripStaffInsert {
  trip_id: string;
  employee_id: string;
  role: StaffRole;
  notes?: string | null;
}

export interface StaffConflict {
  trip_id: string;
  role: StaffRole;
  trip: {
    id: string;
    departure_time: string;
    estimated_arrival_time: string;
    route: { name: string } | null;
  };
}

/**
 * Schedule item for My Schedule page.
 * Represents a trip assigned to an employee with full trip details.
 */
export interface ScheduleItem {
  role: StaffRole;
  notes: string | null;
  trip: {
    id: string;
    departure_time: string;
    estimated_arrival_time: string;
    status: string;
    route: {
      id: string;
      name: string;
      origin_station: { id: string; name: string } | null;
      destination_station: { id: string; name: string } | null;
    } | null;
    vehicle: { id: string; license_plate: string } | null;
  };
}
