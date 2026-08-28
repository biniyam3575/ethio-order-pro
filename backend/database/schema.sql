-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Enums
CREATE TYPE staff_status AS ENUM ('Active', 'Inactive');
CREATE TYPE staff_role AS ENUM ('Manager', 'Waiter', 'Kitchen', 'Cashier');
CREATE TYPE table_status AS ENUM ('Available', 'Occupied', 'Awaiting_Bill');
CREATE TYPE menu_category AS ENUM ('Food', 'Drink', 'Pastry');
CREATE TYPE order_status AS ENUM ('Pending', 'Cooking', 'Served', 'Awaiting_Bill', 'Paid');
CREATE TYPE payment_method AS ENUM ('Cash', 'Telebirr', 'CBE_Birr', 'Pending');
CREATE TYPE discount_status AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE notification_recipient AS ENUM ('Manager', 'Waiter', 'Kitchen', 'Cashier', 'All');

-- Helper Function for Automatic updated_at Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Staff Table
CREATE TABLE staff (
    staff_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    employee_id VARCHAR(30),
    hire_date DATE,
    status staff_status DEFAULT 'Active',
    created_by INT REFERENCES staff(staff_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Staff Roles
CREATE TABLE staff_roles (
    id SERIAL PRIMARY KEY,
    staff_id INT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    role staff_role NOT NULL,
    CONSTRAINT unique_staff_role UNIQUE (staff_id, role)
);

-- 3. Sessions Tracking
CREATE TABLE sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    staff_id INT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    terminal_ip VARCHAR(45),
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. Restaurant Tables
CREATE TABLE tables (
    table_id SERIAL PRIMARY KEY,
    table_number VARCHAR(10) NOT NULL UNIQUE,
    capacity INT DEFAULT 4,
    status table_status DEFAULT 'Available',
    assigned_waiter_id INT REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- 5. Menu Items
CREATE TABLE menu_items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category menu_category NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
    description TEXT,
    image_url VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_menu_items_modtime
    BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6. Orders Master Table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    table_id INT NOT NULL REFERENCES tables(table_id),
    waiter_id INT NOT NULL REFERENCES staff(staff_id),
    cashier_id INT REFERENCES staff(staff_id),
    status order_status DEFAULT 'Pending',
    payment_method payment_method DEFAULT 'Pending',
    payment_ref VARCHAR(100),
    subtotal NUMERIC(10, 2) DEFAULT 0.00,
    service_charge NUMERIC(10, 2) DEFAULT 0.00,
    vat_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    discount_by INT REFERENCES staff(staff_id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMPTZ
);

-- 7. Order Line Items
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES menu_items(item_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    note VARCHAR(255)
);

-- 8. Discount Approval Requests
CREATE TABLE discount_requests (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id),
    requested_by INT NOT NULL REFERENCES staff(staff_id),
    discount_amount NUMERIC(10, 2) NOT NULL,
    reason VARCHAR(255),
    status discount_status DEFAULT 'Pending',
    reviewed_by INT REFERENCES staff(staff_id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. System Audit Log
CREATE TABLE audit_log (
    log_id SERIAL PRIMARY KEY,
    staff_id INT REFERENCES staff(staff_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Notifications Table
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    recipient_role notification_recipient NOT NULL,
    recipient_id INT REFERENCES staff(staff_id) ON DELETE CASCADE,
    message VARCHAR(255) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);