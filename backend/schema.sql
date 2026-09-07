-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE staff_status AS ENUM ('Active', 'Inactive');

CREATE TYPE staff_role AS ENUM (
    'Manager', 'Waiter', 'Kitchen', 'Cashier', 
    'Owner', 'Bar', 'Hot Drinks'
);

CREATE TYPE notification_recipient AS ENUM (
    'Manager', 'Waiter', 'Kitchen', 'Cashier', 
    'Bar', 'Hot Drinks', 'Owner', 'All'
);

CREATE TYPE table_status AS ENUM ('Available', 'Occupied', 'Awaiting_Bill');

CREATE TYPE menu_category AS ENUM ('Food', 'Drink', 'Pastry');

CREATE TYPE item_status AS ENUM ('Pending', 'Preparing', 'Ready', 'Served');

CREATE TYPE order_status AS ENUM (
    'Pending', 'Preparing', 'Cooking', 'Ready', 
    'Served', 'Awaiting_Bill', 'Paid', 'Completed', 'Cancelled'
);

CREATE TYPE payment_method AS ENUM ('Pending', 'Cash', 'Telebirr', 'CBE_Birr');

CREATE TYPE discount_status AS ENUM ('Pending', 'Approved', 'Rejected');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. STAFF
CREATE TABLE IF NOT EXISTS staff (
    staff_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    employee_id VARCHAR(50),
    hire_date DATE,
    status staff_status DEFAULT 'Active',
    created_by INT REFERENCES staff(staff_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. STAFF ROLES (Junction table for multi-role staff)
CREATE TABLE IF NOT EXISTS staff_roles (
    id SERIAL PRIMARY KEY,
    staff_id INT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    role staff_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    staff_id INT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    terminal_ip VARCHAR(50),
    is_active BOOLEAN DEFAULT true
);

-- 4. TABLES
CREATE TABLE IF NOT EXISTS tables (
    table_id SERIAL PRIMARY KEY,
    table_number VARCHAR(50) NOT NULL UNIQUE,
    capacity INT DEFAULT 4,
    status table_status DEFAULT 'Available',
    assigned_waiter_id INT REFERENCES staff(staff_id) ON DELETE SET NULL,
    section VARCHAR(100) DEFAULT 'Main Hall',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    is_available BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    station VARCHAR(100) DEFAULT 'Kitchen',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    table_id INT NOT NULL REFERENCES tables(table_id) ON DELETE RESTRICT,
    waiter_id INT NOT NULL REFERENCES staff(staff_id) ON DELETE RESTRICT,
    cashier_id INT REFERENCES staff(staff_id) ON DELETE SET NULL,
    status order_status DEFAULT 'Pending',
    payment_method payment_method DEFAULT 'Pending',
    payment_ref VARCHAR(255),
    subtotal NUMERIC(10, 2) DEFAULT 0.00,
    service_charge NUMERIC(10, 2) DEFAULT 0.00,
    vat_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    discount_by INT REFERENCES staff(staff_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMPTZ,
    cash_received NUMERIC(10, 2) DEFAULT 0.00,
    change_given NUMERIC(10, 2) DEFAULT 0.00,
    fiscal_receipt_no VARCHAR(100)
);

-- 7. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES menu_items(item_id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    note VARCHAR(255),
    station VARCHAR(100) DEFAULT 'Kitchen',
    status item_status DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ready_at TIMESTAMPTZ
);

-- 8. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    recipient_role notification_recipient NOT NULL,
    recipient_id INT REFERENCES staff(staff_id) ON DELETE CASCADE,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    message VARCHAR(255) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);

-- 9. DISCOUNT REQUESTS
CREATE TABLE IF NOT EXISTS discount_requests (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    requested_by INT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    discount_amount NUMERIC(10, 2) NOT NULL,
    reason VARCHAR(255),
    status discount_status DEFAULT 'Pending',
    reviewed_by INT REFERENCES staff(staff_id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. CASHIER SHIFTS
CREATE TABLE IF NOT EXISTS cashier_shifts (
    shift_id SERIAL PRIMARY KEY,
    cashier_id INT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    opening_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    closing_time TIMESTAMPTZ,
    opening_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_cash NUMERIC(10, 2) DEFAULT 0.00,
    actual_cash NUMERIC(10, 2) DEFAULT 0.00,
    cash_difference NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Open'
);

-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES staff(staff_id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    target_record VARCHAR(255),
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);