-- Revert grid from 12 columns back to 6 columns
-- Tiles with columnSpan=4 (2x2 in 12-col grid) become columnSpan=2 (2x2 in 6-col grid)
UPDATE "Tile" SET "columnSpan" = 2 WHERE "columnSpan" = 4 AND "rowSpan" = 2;

-- Also revert any 2x1 tiles that were doubled (columnSpan 2 stays 2, which is correct for 6-col)
-- No change needed for 2x1 tiles since they were already columnSpan=2

-- Update UserSettings: gridColumns from 12 back to 6
UPDATE "UserSettings" SET "gridColumns" = 6 WHERE "gridColumns" = 12;
