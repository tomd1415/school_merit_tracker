-- Check for negative merits
SELECT pupil_id, first_name, last_name, remaining_merits 
FROM pupil_remaining_merits 
WHERE remaining_merits < 0;

-- Check for negative stock
SELECT prize_id, description, current_stock 
FROM prize_stock 
WHERE current_stock < 0;

