-- 국제 호텔 Room 테스트 쿼리
INSERT INTO rooms (title, price, totalRooms, maxCapacity, productId, createdAt, updatedAt)
VALUES ('디럭스 더블룸', 150000, 10, 2, 1, NOW(), NOW());

INSERT INTO rooms (title, price, totalRooms, maxCapacity, productId, createdAt, updatedAt)
VALUES ('럭셔리 스위트룸', 350000, 5, 4, 1, NOW(), NOW());


-- 국내 호텔 Room 테스트 쿼리
INSERT INTO rooms (title, price, totalRooms, maxCapacity, productId, createdAt, updatedAt)
VALUES ('싱글 룸', 100000, 10, 2, 4, NOW(), NOW());

INSERT INTO rooms (title, price, totalRooms, maxCapacity, productId, createdAt, updatedAt)
VALUES ('럭셔리 스위트룸', 340000, 5, 4, 4, NOW(), NOW());