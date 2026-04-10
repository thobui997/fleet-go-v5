# FleetGo Database Migrations

This directory contains Supabase SQL migration files for FleetGo.

## Applying Migrations

### Via Supabase Dashboard

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Execute each migration file in order:
   - `20260410120000_core_schema.sql`
   - `20260410120001_core_triggers.sql`

### Creating Test Users

After applying migrations, create test users via **Authentication → Users**:

| Email | Name | Role |
|-------|------|------|
| minh.nguyen@fleetgo.vn | Nguyễn Văn Minh | Admin |
| huong.tran@fleetgo.vn | Trần Thị Hương | Fleet Manager |
| duc.le@fleetgo.vn | Lê Văn Đức | Dispatcher |
| bao.pham@fleetgo.vn | Phạm Quốc Bảo | Driver |
| tuan.hoang@fleetgo.vn | Hoàng Minh Tuấn | Driver |
| nhan.vo@fleetgo.vn | Võ Thành Nhân | Driver |
| mai.dang@fleetgo.vn | Đặng Thị Mai | Assistant |
| ha.bui@fleetgo.vn | Bùi Thanh Hà | Ticketing Agent |
| vinh.ngo@fleetgo.vn | Ngô Quang Vinh | Inactive |

**Password:** `devpassword123` for all accounts

After creating users, run the appropriate sections of `seed.sql` (uncomment and update UUIDs).

### Migration Files

Execute in this order:

1. `20260410120000_core_schema.sql` - Core tables (profiles, roles, user_roles, employees)
2. `20260410120001_core_triggers.sql` - Essential triggers (auto-profile, updated_at)
3. `seed.sql` - Development seed data (run after migrations)

## Schema Overview

### Core Tables

- **profiles** - Extends `auth.users`, single source of truth for user data
- **roles** - Dynamic role definitions with JSONB permissions
- **user_roles** - Junction table linking users to roles
- **employees** - Employment-specific data (no user data duplication)

## Seed Data

The `seed.sql` file contains employee records and role assignments. Since creating auth.users via SQL requires pgcrypto extension (which has limitations in Supabase Dashboard), the recommended approach is:

1. **Create users via Dashboard** (Authentication → Users)
2. **Run seed.sql sections** after updating with actual user UUIDs

See detailed instructions in `seed.sql` header comments.

## Notes

- Migrations use idempotent patterns (`ON CONFLICT DO NOTHING`)
- RLS policies are added in separate plan (02-06)
- Trigger functions use `security definer` with `set search_path = public` for security
