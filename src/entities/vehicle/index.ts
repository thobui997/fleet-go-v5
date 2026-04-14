export type {
  Vehicle,
  VehicleWithType,
  VehicleInsert,
  VehicleUpdate,
  VehicleListParams,
  VehicleStatus,
} from './model/types';

export { VEHICLE_STATUSES } from './model/types';

export {
  useVehicles,
  useVehicle,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from './api/vehicle.queries';
