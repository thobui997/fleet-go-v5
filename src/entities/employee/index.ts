export type {
  Employee,
  EmployeeInsert,
  EmployeeUpdate,
  EmployeeListParams,
  EmployeeProfile,
} from './model/types';

export {
  useEmployees,
  useEmployee,
  useProfiles,
  useEmployeeRole,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from './api/employee.queries';

export { assignEmployeeRole } from './api/employee.api';
