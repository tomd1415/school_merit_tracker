-- 1. form table
CREATETABLEform(
  form_idINTEGERGENERATED ALWAYSASIDENTITYPRIMARYKEY,
  form_nameVARCHAR(100)NOTNULL,
  form_tutorVARCHAR(100)NOTNULL,
  year_groupINTEGERNOTNULLCHECK(
    year_group >= 0
    AND year_group <= 14
  ),
  activeBOOLEANNOTNULLDEFAULTTRUE
);
-- 2. pupils table
CREATETABLEpupils(
pupil_idINTEGERGENERATED ALWAYSASIDENTITYPRIMARYKEY,
first_nameVARCHAR(100)NOTNULL,
last_nameVARCHAR(100)NOTNULL,
meritsINTEGERNOTNULLCHECK(
  merits >= 0
),
form_idINTEGERNOTNULL,
activeBOOLEANNOTNULLDEFAULTTRUE,
CONSTRAINTfk_pupils_formFOREIGNKEY(
  form_id
)REFERENCESform(form_id)
  ON DELETENOACTION
);
-- 3. prizes table
CREATETABLEprizes(
prize_idINTEGERGENERATED ALWAYSASIDENTITYPRIMARYKEY,
descriptionTEXTNOTNULL,
cost_meritsINTEGERNOTNULLCHECK(
cost_merits >= 0
),
cost_moneyINTEGERNOTNULLCHECK(
cost_money >= 0
),
-- cost in pence
image_pathVARCHAR(255)NOTNULL,
total_stocked_everINTEGERNOTNULLCHECK(
total_stocked_ever >= 0
),
stock_adjustmentINTEGERNOTNULL,
activeBOOLEANNOTNULLDEFAULTTRUE
);
-- 4. purchase table
CREATETABLEpurchase(
purchase_idINTEGERGENERATED ALWAYSASIDENTITYPRIMARYKEY,
pupil_idINTEGERNOTNULL,
prize_idINTEGERNOTNULL,
merit_cost_at_timeINTEGERNOTNULLCHECK(
merit_cost_at_time >= 0
),
DATETIMESTAMPNOTNULL,
activeBOOLEANNOTNULLDEFAULTTRUE,
CONSTRAINTfk_purchase_pupilFOREIGNKEY(
pupil_id
)REFERENCESpupils(pupil_id)
ON DELETENOACTIONCONSTRAINTfk_purchase_prizeFOREIGNKEY(
prize_id
)REFERENCESprizes(prize_id)
ON DELETENOACTION
);
CREATEVIEWprize_stockASSELECT
p.prize_id,
p.description,
p.total_stocked_ever + p.stock_adjustment - COUNT(pu.purchase_id)::INTAScurrent_stock
FROM
prizes p
LEFT JOIN purchase pu
ON p.prize_id = pu.prize_id
AND pu.active = TRUE
WHERE
p.active = TRUE
GROUP BY
p.prize_id,
p.description,
p.total_stocked_ever,
p.stock_adjustment;
CREATEVIEWpupil_remaining_meritsASSELECT
p.pupil_id,
p.first_name,
p.last_name,
p.merits - COALESCE(SUM(pu.merit_cost_at_time), 0) AS remaining_merits
FROM
pupils p
LEFT JOIN purchase pu
ON p.pupil_id = pu.pupil_id
AND pu.active = TRUE-- Only count active purchases

WHERE
p.active = TRUE-- Only show active pupils

GROUP BY
p.pupil_id,
p.first_name,
p.last_name,
p.merits;
