export type {
  Customer,
  CustomerInsert,
  CustomerUpdate,
  CustomerListParams,
} from './model/types';

export {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from './api/customer.queries';
