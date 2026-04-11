-- ============================================================
-- FleetGo Development Seed Data
-- Run AFTER migrations (20260410120000 and 20260410120001)
-- ============================================================

-- ============================================================
-- IMPORTANT: Create Auth Users FIRST
-- ============================================================
-- This seed data requires users to exist. Before running this file:

-- OPTION A: Create Users via Supabase Dashboard (Recommended)
-- -----------------------------------------------------------
-- 1. Go to: Authentication → Users → "Add user" → "Create new user"
-- 2. Create these 9 users with password "devpassword123":
--
--    Email                      | Full Name              | Role
--    ---------------------------|------------------------|------------------
--    minh.nguyen@fleetgo.vn     | Nguyễn Văn Minh        | Admin
--    huong.tran@fleetgo.vn      | Trần Thị Hương         | Fleet Manager
--    duc.le@fleetgo.vn          | Lê Văn Đức             | Dispatcher
--    bao.pham@fleetgo.vn        | Phạm Quốc Bảo          | Driver
--    tuan.hoang@fleetgo.vn      | Hoàng Minh Tuấn        | Driver
--    nhan.vo@fleetgo.vn         | Võ Thành Nhân          | Driver
--    mai.dang@fleetgo.vn        | Đặng Thị Mai           | Assistant
--    ha.bui@fleetgo.vn          | Bùi Thanh Hà           | Ticketing Agent
--    vinh.ngo@fleetgo.vn        | Ngô Quang Vinh         | Inactive
--
-- 3. For each user, click "Auto Confirm User" = YES
-- 4. Add full_name to user metadata
-- 5. After creating all users, run: select id, email, full_name from profiles;
-- 6. Copy the actual UUIDs and update them below in Steps 2 and 3

-- OPTION B: Create pgcrypto Extension First
-- -----------------------------------------------------------
-- If you prefer to create users via SQL, first run:
--   create extension if not exists pgcrypto;
--
-- Then uncomment the auth.users insertion block at the end of this file.
-- ============================================================

-- ============================================================
-- STEP 1: Verify Users Exist
-- ============================================================
-- Run this query to see your users and get their UUIDs:
--
-- select id, email, full_name from profiles order by created_at;
--
-- Copy the UUIDs and update the placeholders below.

-- ============================================================
-- STEP 2: Update These UUIDs With Your Actual User IDs
-- ============================================================
-- After creating users, replace these placeholder UUIDs with actual IDs:
--
-- RUN THIS QUERY TO GET YOUR UUIDS:
-- select id, email, full_name from profiles order by email;
--
-- Then update each USER_ID_<role> below with the actual UUID.

-- ============================================================
-- STEP 3: Create Employee Records
-- ============================================================
-- NOTE: Update the UUIDs below with actual user IDs from your profiles table!

-- For now, this section is commented out. After you create users and get their UUIDs,
-- uncomment this section and replace the placeholder UUIDs.

insert into public.employees (user_id, hire_date, license_number, license_expiry, is_active)
values
  -- Admin (no license needed) — Replace USER_ID_ADMIN with actual UUID
  ('0342405e-bef4-47d2-8be0-37c7219a5957', '2023-01-15', null, null, true),

  -- Fleet Manager (no license needed) — Replace USER_ID_MANAGER with actual UUID
  ('8fcb101c-629c-4ab1-b7f3-c31dd665d77a', '2023-03-20', null, null, true),

  -- Dispatcher (no license needed) — Replace USER_ID_DISPATCHER with actual UUID
  ('1fbbba6a-afd3-4ed8-910d-848ca61d9100', '2023-06-01', null, null, true),

  -- Driver 1 (license expires far future - 2027) — Replace USER_ID_DRIVER1 with actual UUID
  ('7577d2c3-341c-4594-bc55-2fd3dc84cb70', '2022-08-10', 'B2-123456789', '2027-02-15', true),

  -- Driver 2 (license expires ~1 month out - for alert testing) — Replace USER_ID_DRIVER2
  ('74de290a-5869-42cc-956e-311fd747c368', '2023-01-05', 'B2-987654321', '2026-05-20', true),

  -- Driver 3 (license expires ~2 weeks out - for alert testing) — Replace USER_ID_DRIVER3
  ('4c52fb14-8ab9-45c9-8289-1d2c120ae60c', '2024-02-14', 'B2-456789123', '2026-04-25', true),

  -- Driver Assistant (no license) — Replace USER_ID_ASSISTANT with actual UUID
  ('33a51e9d-39a3-4eaf-add1-38e5dce1d666', '2023-09-12', null, null, true),

  -- Ticketing Agent (no license) — Replace USER_ID_AGENT with actual UUID
  ('97c55a15-d6ba-4e3a-9f5b-f63b5c2518d3', '2024-01-08', null, null, true),

  -- Inactive employee (for is_active filter testing) — Replace USER_ID_INACTIVE
  ('b2a702a9-396b-4410-9cfa-66c5fd9fa955', '2022-05-20', 'B2-111222333', '2025-11-30', false)
on conflict do nothing;

-- ============================================================
-- STEP 4: Assign Roles to Users
-- ============================================================
-- NOTE: Update the UUIDs below with actual user IDs from your profiles table!


insert into public.user_roles (user_id, role_id)
values
  -- Admin → admin role
  ('0342405e-bef4-47d2-8be0-37c7219a5957', (select id from public.roles where name = 'admin')),

  -- Fleet Manager → fleet_manager role
  ('8fcb101c-629c-4ab1-b7f3-c31dd665d77a', (select id from public.roles where name = 'fleet_manager')),

  -- Dispatcher → dispatcher role
  ('1fbbba6a-afd3-4ed8-910d-848ca61d9100', (select id from public.roles where name = 'dispatcher')),

  -- Drivers → driver role
  ('7577d2c3-341c-4594-bc55-2fd3dc84cb70', (select id from public.roles where name = 'driver')),
  ('74de290a-5869-42cc-956e-311fd747c368', (select id from public.roles where name = 'driver')),
  ('4c52fb14-8ab9-45c9-8289-1d2c120ae60c', (select id from public.roles where name = 'driver')),

  -- Assistant → assistant role
  ('33a51e9d-39a3-4eaf-add1-38e5dce1d666', (select id from public.roles where name = 'assistant')),

  -- Ticketing Agent → ticketing_agent role
  ('97c55a15-d6ba-4e3a-9f5b-f63b5c2518d3', (select id from public.roles where name = 'ticketing_agent')),

  -- Inactive → driver role (was a driver before deactivation)
  ('b2a702a9-396b-4410-9cfa-66c5fd9fa955', (select id from public.roles where name = 'driver'))
on conflict do nothing;

-- ============================================================
-- FLEET SEED DATA
-- ============================================================
-- Fleet tables seed data: vehicle types, vehicles, maintenance logs
-- Run AFTER fleet schema migrations (20260411130000 and 20260411130001)
-- ============================================================

-- ============================================================
-- STEP 1: Create Vehicle Types
-- ============================================================
insert into public.vehicle_types (name, description, seat_layout, total_floors, total_seats, amenities)
values
  (
    'Giuong nam 40 cho',
    'Xe giuong nam 40 cho 2 tang',
    '{"floors": 2, "rows": 10, "cols_per_floor": 20, "seat_ids": ["1A","1B","2A","2B","3A","3B","4A","4B","5A","5B","6A","6B","7A","7B","8A","8B","9A","9B","10A","10B","11A","11B","12A","12B","13A","13B","14A","14B","15A","15B","16A","16B","17A","17B","18A","18B","19A","19B","20A","20B"]}'::jsonb,
    2,
    40,
    '["wifi", "charging", "ac", "blanket"]'::jsonb
  ),
  (
    'Limousine 24 cho',
    'Xe Limousine 24 cho 1 tang',
    '{"floors": 1, "rows": 8, "cols_per_floor": 3, "seat_ids": ["1A","1B","1C","2A","2B","2C","3A","3B","3C","4A","4B","4C","5A","5B","5C","6A","6B","6C","7A","7B","7C","8A","8B","8C"]}'::jsonb,
    1,
    24,
    '["wifi", "charging", "ac", "tv", "water"]'::jsonb
  ),
  (
    'Ghe ngoi 29 cho',
    'Xe ghe ngoi 29 cho 1 tang',
    '{"floors": 1, "rows": 8, "cols_per_floor": 4, "seat_ids": ["1A","1B","1C","1D","2A","2B","2C","2D","3A","3B","3C","3D","4A","4B","4C","4D","5A","5B","5C","5D","6A","6B","6C","6D","7A","7B","7C","7D","8A","8B","8C"]}'::jsonb,
    1,
    29,
    '["ac", "charging"]'::jsonb
  ),
  (
    'Giuong nam VIP 22 cho',
    'Xe giuong nam VIP 22 cho 2 tang',
    '{"floors": 2, "rows": 6, "cols_per_floor": 11, "seat_ids": ["1A","1B","2A","2B","3A","3B","4A","4B","5A","5B","6A","6B","7A","7B","8A","8B","9A","9B","10A","10B","11A","11B"]}'::jsonb,
    2,
    22,
    '["wifi", "charging", "ac", "tv", "blanket", "curtain"]'::jsonb
  ),
  (
    'Cabin 11 cho',
    'Xe Cabin 11 cho 1 tang',
    '{"floors": 1, "rows": 11, "cols_per_floor": 1, "seat_ids": ["1","2","3","4","5","6","7","8","9","10","11"]}'::jsonb,
    1,
    11,
    '["wifi", "charging", "ac", "tv", "water", "snack"]'::jsonb
  )
on conflict (name) do nothing;

-- ============================================================
-- STEP 2: Create Vehicles
-- ============================================================
-- Uses SELECT-based FK resolution to reference vehicle types by name
-- This works correctly with ON CONFLICT DO NOTHING on re-runs

insert into public.vehicles (vehicle_type_id, license_plate, vin_number, year_manufactured, status, current_mileage, last_maintenance_date, next_maintenance_date, notes)
select
  vt.id,
  '51A-12345',
  null,
  2022,
  'active',
  185000,
  '2025-02-15',
  '2025-08-15',
  'Xe chinh truc, tot'
from public.vehicle_types vt
where vt.name = 'Giuong nam 40 cho'
on conflict (license_plate) do nothing;

insert into public.vehicles (vehicle_type_id, license_plate, vin_number, year_manufactured, status, current_mileage, last_maintenance_date, next_maintenance_date, notes)
select
  vt.id,
  '51A-12346',
  null,
  2023,
  'active',
  125000,
  '2025-03-01',
  '2025-09-01',
  'Xe moi, het bao hanh'
from public.vehicle_types vt
where vt.name = 'Giuong nam 40 cho'
on conflict (license_plate) do nothing;

insert into public.vehicles (vehicle_type_id, license_plate, vin_number, year_manufactured, status, current_mileage, last_maintenance_date, next_maintenance_date, notes)
select
  vt.id,
  '51B-67890',
  null,
  2021,
  'active',
  280000,
  '2025-01-20',
  '2025-07-20',
  null
from public.vehicle_types vt
where vt.name = 'Limousine 24 cho'
on conflict (license_plate) do nothing;

insert into public.vehicles (vehicle_type_id, license_plate, vin_number, year_manufactured, status, current_mileage, last_maintenance_date, next_maintenance_date, notes)
select
  vt.id,
  '51B-67891',
  null,
  2024,
  'active',
  52000,
  '2025-03-10',
  '2025-09-10',
  'Xe moi, chua bao duong lan dau'
from public.vehicle_types vt
where vt.name = 'Limousine 24 cho'
on conflict (license_plate) do nothing;

insert into public.vehicles (vehicle_type_id, license_plate, vin_number, year_manufactured, status, current_mileage, last_maintenance_date, next_maintenance_date, notes)
select
  vt.id,
  '51C-11111',
  null,
  2020,
  'active',
  310000,
  '2025-02-01',
  '2025-08-01',
  null
from public.vehicle_types vt
where vt.name = 'Ghe ngoi 29 cho'
on conflict (license_plate) do nothing;

insert into public.vehicles (vehicle_type_id, license_plate, vin_number, year_manufactured, status, current_mileage, last_maintenance_date, next_maintenance_date, notes)
select
  vt.id,
  '51C-11112',
  null,
  2019,
  'maintenance',
  345000,
  '2025-03-05',
  '2025-04-05',
  'Dang bao duong dai ky'
from public.vehicle_types vt
where vt.name = 'Ghe ngoi 29 cho'
on conflict (license_plate) do nothing;

insert into public.vehicles (vehicle_type_id, license_plate, vin_number, year_manufactured, status, current_mileage, last_maintenance_date, next_maintenance_date, notes)
select
  vt.id,
  '51D-22222',
  null,
  2024,
  'active',
  78000,
  '2025-02-20',
  '2025-08-20',
  'Xe VIP phuc vu tuyen Ha Noi - Da Nang'
from public.vehicle_types vt
where vt.name = 'Giuong nam VIP 22 cho'
on conflict (license_plate) do nothing;

insert into public.vehicles (vehicle_type_id, license_plate, vin_number, year_manufactured, status, current_mileage, last_maintenance_date, next_maintenance_date, notes)
select
  vt.id,
  '51E-33333',
  null,
  2019,
  'retired',
  420000,
  '2024-10-15',
  null,
  'Xe cu, da ngung hoat dong'
from public.vehicle_types vt
where vt.name = 'Cabin 11 cho'
on conflict (license_plate) do nothing;

-- ============================================================
-- STEP 3: Create Maintenance Logs
-- ============================================================
-- Uses SELECT-based FK resolution to reference vehicles by license plate
-- This works correctly with ON CONFLICT DO NOTHING on re-runs

insert into public.maintenance_logs (vehicle_id, type, description, cost, performed_by, performed_at, next_due_date, odometer_reading, notes)
select
  v.id,
  'routine',
  'Bao duong dinh ky: thay dau, kiem tra phanh, kiem tra lop',
  2500000.00,
  'Tai Hien - Garage Xe Khach',
  '2025-02-15',
  '2025-08-15',
  185000,
  null
from public.vehicles v
where v.license_plate = '51A-12345'
on conflict (id) do nothing;

insert into public.maintenance_logs (vehicle_id, type, description, cost, performed_by, performed_at, next_due_date, odometer_reading, notes)
select
  v.id,
  'repair',
  'Thay hop so bi chay',
  15000000.00,
  'Tai Hien - Garage Xe Khach',
  '2025-01-20',
  '2025-07-20',
  278000,
  'Can canh bao hanh'
from public.vehicles v
where v.license_plate = '51B-67890'
on conflict (id) do nothing;

insert into public.maintenance_logs (vehicle_id, type, description, cost, performed_by, performed_at, next_due_date, odometer_reading, notes)
select
  v.id,
  'routine',
  'Bao duong 5000km: thay nhot, kiem tra may',
  1500000.00,
  'VinFast Service Center',
  '2025-03-10',
  '2025-09-10',
  52000,
  'Xe moi, lan dau bao duong'
from public.vehicles v
where v.license_plate = '51B-67891'
on conflict (id) do nothing;

insert into public.maintenance_logs (vehicle_id, type, description, cost, performed_by, performed_at, next_due_date, odometer_reading, notes)
select
  v.id,
  'inspection',
  'Kiem tra dinh ky hang nam',
  500000.00,
  'Dang kiem Hanoi',
  '2025-02-01',
  '2026-02-01',
  310000,
  'Dat yeu cau an toan'
from public.vehicles v
where v.license_plate = '51C-11111'
on conflict (id) do nothing;

insert into public.maintenance_logs (vehicle_id, type, description, cost, performed_by, performed_at, next_due_date, odometer_reading, notes)
select
  v.id,
  'emergency',
  'Su co benh giua duong: thay lop xe bi phat',
  800000.00,
  'Cuu ho gia thong 24/7',
  '2025-03-05',
  '2025-04-05',
  344500,
  null
from public.vehicles v
where v.license_plate = '51C-11112'
on conflict (id) do nothing;

insert into public.maintenance_logs (vehicle_id, type, description, cost, performed_by, performed_at, next_due_date, odometer_reading, notes)
select
  v.id,
  'routine',
  'Bao duong sau 20000km: thay nhot, kiem tra dieu hoa',
  3200000.00,
  'Tai Hien - Garage Xe Khach',
  '2025-02-20',
  '2025-08-20',
  78000,
  null
from public.vehicles v
where v.license_plate = '51D-22222'
on conflict (id) do nothing;

-- ============================================================
-- OPTIONAL: Create Users Directly via SQL
-- ============================================================
-- ONLY use this if you have pgcrypto extension enabled:
-- Run: create extension if not exists pgcrypto;
-- Then uncomment and run the block below:

/*
create extension if not exists pgcrypto;

insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at
) values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'minh.nguyen@fleetgo.vn',
   crypt('devpassword123', gen_salt('bf')), now(),
   '{"full_name": "Nguyễn Văn Minh"}', now(), now()),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'huong.tran@fleetgo.vn',
   crypt('devpassword123', gen_salt('bf')), now(),
   '{"full_name": "Trần Thị Hương"}', now(), now()),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'duc.le@fleetgo.vn',
   crypt('devpassword123', gen_salt('bf')), now(),
   '{"full_name": "Lê Văn Đức"}', now(), now()),
  ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bao.pham@fleetgo.vn',
   crypt('devpassword123', gen_salt('bf')), now(),
   '{"full_name": "Phạm Quốc Bảo", "phone": "0945678901"}', now(), now()),
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'tuan.hoang@fleetgo.vn',
   crypt('devpassword123', gen_salt('bf')), now(),
   '{"full_name": "Hoàng Minh Tuấn", "phone": "0956789012"}', now(), now()),
  ('a0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'nhan.vo@fleetgo.vn',
   crypt('devpassword123', gen_salt('bf')), now(),
   '{"full_name": "Võ Thành Nhân", "phone": "0967890123"}', now(), now()),
  ('a0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'mai.dang@fleetgo.vn',
   crypt('devpassword123', gen_salt('bf')), now(),
   '{"full_name": "Đặng Thị Mai", "phone": "0978901234"}', now(), now()),
  ('a0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ha.bui@fleetgo.vn',
   crypt('devpassword123', gen_salt('bf')), now(),
   '{"full_name": "Bùi Thanh Hà", "phone": "0989012345"}', now(), now()),
  ('a0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'vinh.ngo@fleetgo.vn',
   crypt('devpassword123', gen_salt('bf')), now(),
   '{"full_name": "Ngô Quang Vinh", "phone": "0990123456"}', now(), now())
on conflict (id) do nothing;

-- After running the above, the trigger auto-creates profiles.
-- Then you can run Steps 2 and 3 with the deterministic UUIDs.
*/
