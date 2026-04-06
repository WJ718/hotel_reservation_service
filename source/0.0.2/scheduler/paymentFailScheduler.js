const cron = require('node-cron');
const { Op } = require('sequelize');
const { Payment } = require('../models');
const { failPendingReservation } = require('../services/reserveService');

let isRunning = false;

function startFailScheduler() {
    // 크론 설정 - 3분 주기로 검사
    cron.schedule('*/3 * * * *', async () => {
        if (isRunning) {
            return;
        }

        isRunning = true;
        `[FAIL_SCHEDULER] 실행`

        try {
            const time = new Date(Date.now() - 10 * 60 * 1000); // 10분 전

            // 10분 넘게 READY 상태인 결제 찾기
            const pendingPayments = await Payment.findAll({
                where: {
                    status: 'READY',
                    createdAt: {
                        [Op.lte]: time
                    }
                },
                attributes: ['orderId']
            });

            if (!pendingPayments.length) {
                return;
            }

            // 결제-예약 실패처리 & 재고 복구
            for (const payment of pendingPayments) {
                try {
                    const result = await failPendingReservation({ // {skipped, roomId, dates, orderId}
                        orderId: payment.orderId,
                        paymentStatus: 'FAILED',
                        reservationStatus: 'FAILED'
                    });

                    if (!result.skipped) {
                        console.log(
                            `[FAIL_SCHEDULER] orderId=${payment.orderId} 실패 처리 및 재고 복구 완료`
                        );
                    }
                } catch (err) {
                    console.error(
                        `[FAIL_SCHEDULER] orderId=${payment.orderId} 처리 중 오류:`,
                        err
                    );
                }
            }

            console.log(`[FAIL_SCHEDULER] ${pendingPayments.length}건 점검 완료`);
        } catch (err) {
            console.error('[FAIL_SCHEDULER] 스케줄러 오류:', err);
        } finally {
            isRunning = false;
        }
    });
}

/*
복구 성공적 - DB확인 완료
LOG:
[FAIL_SCHEDULER] orderId=TRIP-7238a8f5-ba19-46ff-a734-aa8f37b2a43c 실패 처리 및 재고 복구 완료
[FAIL_SCHEDULER] 1건 점검 완료
*/

module.exports = { startFailScheduler };