-- Add tax and tip columns to bills table
ALTER TABLE bills 
ADD COLUMN tax NUMERIC DEFAULT 0,
ADD COLUMN tip NUMERIC DEFAULT 0;