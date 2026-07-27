-- Convert legacy 1–10 queue severity scores to the new 1–4 scale.
UPDATE queue_entries
SET severity_score =
    CASE
        WHEN severity_score IS NULL OR severity_score < 1 THEN 1
        WHEN severity_score <= 2 THEN 1
        WHEN severity_score <= 5 THEN 2
        WHEN severity_score <= 8 THEN 3
        ELSE 4
    END
WHERE severity_score IS NULL
   OR severity_score < 1
   OR severity_score > 4;

-- Keep the label consistent with the normalized score.
UPDATE queue_entries
SET severity_label =
    CASE severity_score
        WHEN 4 THEN 'EMERGENCY'
        WHEN 3 THEN 'SEVERE'
        WHEN 2 THEN 'MODERATE'
        ELSE 'MILD'
    END;

-- Keep the emergency flag consistent.
UPDATE queue_entries
SET is_emergency = CASE
    WHEN severity_score = 4 THEN TRUE
    ELSE FALSE
END;