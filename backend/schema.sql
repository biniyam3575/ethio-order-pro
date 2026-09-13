-- Clean setup drop sequence
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notification_reads CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cashier_shifts CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS staff_roles CASCADE;
DROP TABLE IF EXISTS staff CASCADE;

DROP TYPE IF EXISTS item_status CASCADE;
DROP TYPE IF EXISTS menu_category CASCADE;
DROP TYPE IF EXISTS notification_recipient CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS staff_role CASCADE;
DROP TYPE IF EXISTS staff_status CASCADE;
DROP TYPE IF EXISTS table_status CASCADE;

-- Custom ENUM Types
CREATE TYPE staff_role AS ENUM ('Manager', 'Waiter', 'Kitchen', 'Cashier', 'Owner', 'Bar', 'Hot Drinks');
CREATE TYPE staff_status AS ENUM ('Active', 'Inactive');
CREATE TYPE table_status AS ENUM ('Available', 'Occupied', 'Awaiting_Bill');
CREATE TYPE menu_category AS ENUM ('Food', 'Drink', 'Pastry', 'Hot Beverages', 'Breakfast', 'Mains');
CREATE TYPE order_status AS ENUM ('Pending', 'Cooking', 'Preparing', 'Ready', 'Served', 'Awaiting_Bill', 'Paid', 'Completed', 'Cancelled');
CREATE TYPE item_status AS ENUM ('Pending', 'Preparing', 'Ready', 'Served', 'Cancelled');
CREATE TYPE payment_method AS ENUM ('Cash', 'Telebirr', 'CBE_Birr', 'Pending');
CREATE TYPE notification_recipient AS ENUM ('Manager', 'Waiter', 'Kitchen', 'Cashier', 'Bar', 'Hot Drinks', 'Owner', 'All');

-- Staff & Authentication
CREATE TABLE staff (
    staff_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    employee_id VARCHAR(50) UNIQUE,
    hire_date DATE,
    status staff_status DEFAULT 'Active',
    created_by INT REFERENCES staff(staff_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_roles (
    id SERIAL PRIMARY KEY,
    staff_id INT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    role staff_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, role)
);

CREATE TABLE sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    staff_id INT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    terminal_ip VARCHAR(45),
    is_active BOOLEAN DEFAULT true
);

-- Dining Area & Menu Management
CREATE TABLE tables (
    table_id SERIAL PRIMARY KEY,
    table_number VARCHAR(10) UNIQUE NOT NULL,
    capacity INT DEFAULT 4,
    status table_status DEFAULT 'Available',
    assigned_waiter_id INT REFERENCES staff(staff_id) ON DELETE SET NULL,
    section VARCHAR(50) DEFAULT 'Main Hall',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menu_items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category menu_category NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    description TEXT,
    image_url VARCHAR(255),
    station VARCHAR(50) DEFAULT 'Kitchen',
    is_available BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Financial Operations
CREATE TABLE cashier_shifts (
    shift_id SERIAL PRIMARY KEY,
    cashier_id INT NOT NULL REFERENCES staff(staff_id),
    opening_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    closing_time TIMESTAMPTZ,
    opening_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_cash NUMERIC(10, 2) DEFAULT 0.00,
    actual_cash NUMERIC(10, 2) DEFAULT 0.00,
    cash_difference NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'Open'
);

-- Orders & Line Items
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    table_id INT NOT NULL REFERENCES tables(table_id),
    waiter_id INT NOT NULL REFERENCES staff(staff_id),
    cashier_id INT REFERENCES staff(staff_id),
    shift_id INT REFERENCES cashier_shifts(shift_id),
    status order_status DEFAULT 'Pending',
    payment_method payment_method DEFAULT 'Pending',
    payment_ref VARCHAR(100),
    subtotal NUMERIC(10, 2) DEFAULT 0.00,
    service_charge NUMERIC(10, 2) DEFAULT 0.00,
    vat_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    cash_received NUMERIC(10, 2) DEFAULT 0.00,
    change_given NUMERIC(10, 2) DEFAULT 0.00,
    fiscal_receipt_no VARCHAR(100),
    cancellation_reason VARCHAR(255),
    cancelled_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES menu_items(item_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    note VARCHAR(255),
    station VARCHAR(50) DEFAULT 'Kitchen',
    status item_status DEFAULT 'Pending',
    cancellation_reason VARCHAR(255),
    cancelled_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Notifications & System Logging
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    recipient_role notification_recipient NOT NULL,
    recipient_id INT REFERENCES staff(staff_id) ON DELETE CASCADE,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    message VARCHAR(255) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);

CREATE TABLE notification_reads (
    notification_id INT NOT NULL REFERENCES notifications(notification_id) ON DELETE CASCADE,
    staff_id INT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id, staff_id)
);

CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES staff(staff_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_record VARCHAR(100),
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS station_order_dismissals (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  station VARCHAR(50) NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id, station)
);

-- Performance Indexes
CREATE INDEX idx_orders_table_status ON orders(table_id, status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_staff_roles_lookup ON staff_roles(staff_id, role);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_role, recipient_id, is_read);
CREATE INDEX idx_station_dismissals_lookup ON station_order_dismissals(order_id, station);
CREATE INDEX idx_menu_items_station ON menu_items(station) WHERE is_available = true;
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);