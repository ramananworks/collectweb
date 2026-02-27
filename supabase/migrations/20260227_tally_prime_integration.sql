-- Supabase schema migration for tally_prime_integration

-- This migration integrates tally_prime with the existing schema.

CREATE TABLE tally_prime (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now() ON UPDATE now()
);

-- Add more migration steps as needed