// checkin ~ checkout 사이 날짜를 배열로 리턴
exports.getDatesBetween = (checkin, checkout) => {
    const dates = []; 
    let currentDate = new Date(checkin);
    const endDate = new Date(checkout);

    while(currentDate < endDate) {
        dates.push(currentDate.toISOString().split('T')[0]); 
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
};
