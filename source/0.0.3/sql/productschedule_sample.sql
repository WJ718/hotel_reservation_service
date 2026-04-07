INSERT INTO productschedules (date, remainingRooms, roomId, createdAt, updatedAt)
WITH RECURSIVE DateRange AS (
    -- 1. 시작 날짜 설정
    SELECT '2026-04-05' AS dt
    UNION ALL
    -- 2. 종료 날짜까지 1일씩 더하며 반복
    SELECT dt + INTERVAL 1 DAY
    FROM DateRange
    WHERE dt < '2026-04-30' 
)
SELECT 
    dt,           -- 생성된 날짜
    15,           -- remainingRooms (고정값)
    1,            -- roomId (고정값)
    NOW(),        -- createdAt
    NOW()         -- updatedAt
FROM DateRange;