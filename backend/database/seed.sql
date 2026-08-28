-- Create initial Admin Manager account (Password: 123456)
INSERT INTO staff (full_name, username, password_hash, status)
VALUES ('Admin Manager', 'admin', '$2a$12$eImiTXuWVxfMjp7oo73.rO./hT04N4uP1y5XF/bW/0Bw0H1d.jGye', 'Active');

-- Assign Manager Role
INSERT INTO staff_roles (staff_id, role)
VALUES (1, 'Manager');

-- Create Default Floor Plan Tables
INSERT INTO tables (table_number, capacity, status)
VALUES 
  ('T-01', 4, 'Available'),
  ('T-02', 2, 'Available'),
  ('T-03', 6, 'Available'),
  ('T-04', 4, 'Available');