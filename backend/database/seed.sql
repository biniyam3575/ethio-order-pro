-- -- ============================================================================
-- -- ETHIO-ORDER PRO V2.0 - CANONICAL ONBOARDING SYSTEM SEED ENGINE
-- -- SOURCE FILE: backend/database/seed.sql
-- -- ============================================================================

-- -- 1. SEED SYSTEM MANAGER OWNER ACCOUNTS REGISTER [cite: 263]
-- -- Generates seed master administrator account using verified bcrypt reference strings for security [cite: 285]
-- INSERT INTO staff (staff_id, full_name, username, password_hash, phone, employee_id, hire_date, status, created_by)
-- VALUES (1, 'Biniyam Beyene', 'admin', '$2b$12$e0g2Z1p0NRYD2/hS5Z8qS.oV0EWe3TOnmGvUshG/V9O4gCdfqUfe2', '+251911223344', 'EMP-001', CURDATE(), 'Active', NULL);

-- -- 2. ASSIGN AUTHORITATIVE MANAGER ROLE ACCESS [cite: 265]
-- INSERT INTO staff_roles (staff_id, role) VALUES (1, 'Manager');

-- -- 3. ONBOARD BASE PHYSICAL RESTAURANT SEATING SCHEMATIC [cite: 267]
-- INSERT INTO tables (table_number, capacity, status) VALUES 
-- ('T-01', 2, 'Available'),
-- ('T-02', 4, 'Available'),
-- ('T-03', 4, 'Available'),
-- ('T-04', 6, 'Available'),
-- ('T-05', 8, 'Available');

-- -- 4. SEED CORE REVENUE GENERATING MENU CATALOGS ITEMS [cite: 269]
-- INSERT INTO menu_items (name, category, price, description, is_available, display_order) VALUES
-- -- Category: Drinks [cite: 158]
-- ('Macchiato', 'Drink', 45.00, 'Traditional local espresso cut with rich steamed milk', TRUE, 1),
-- ('Ambo Water', 'Drink', 40.00, 'Sparkling naturally carbonated mineral water', TRUE, 2),
-- ('Avocado Juice', 'Drink', 95.00, 'Layered thick organic avocado puree served cold', TRUE, 3),

-- -- Category: Food [cite: 158]
-- ('Special Beyaynetu', 'Food', 180.00, 'Platter containing distinct spiced fasting vegan dishes over injera', TRUE, 1),
-- ('Chiko', 'Food', 150.00, 'Traditional seasoned barley meal base kneaded with pure niter kibbeh', TRUE, 2),
-- ('Tibs Firfir', 'Food', 220.00, 'Sauteed beef cubes simmered in berbere stew tossed with shredded injera', TRUE, 3),

-- -- Category: Pastry [cite: 158]
-- ('Tiramisu Cake', 'Pastry', 110.00, 'Espresso soaked sponge layers whipped with sweet cream matrix', TRUE, 1),
-- ('Baklava', 'Pastry', 85.00, 'Crispy phyllo sheets packed with crushed nuts and warm honey glaze', TRUE, 2);