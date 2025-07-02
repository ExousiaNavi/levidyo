# backend/core/deposit.py

from backend.core.firebase import db

#for deposit
def refactor_deposit_data(docs, brand):
    chart_hours = []
    today_values = []
    cumulative_values = []
    last_day_values = []
    last_cumulative_values = []
    history_log = []

    total_today_deposit = 0
    total_today_cumulative = 0
    ld_deposit = 0
    ld_cumulative = 0
    cdod = 0
    cwow = 0
    hdod = 0
    hwow = 0

    for doc in docs:
        data = doc.to_dict()
        if data.get("brand") != brand:
            continue

        hour = doc.id
        chart_hours.append(f"{hour}:00")
        today_deposit = data.get("today_deposit", 0)
        cumulative = data.get("today_cumulative", 0)

        today_values.append(today_deposit)
        cumulative_values.append(cumulative)
        last_day_values.append(data.get("ld_deposit", 0))
        last_cumulative_values.append(data.get("ld_cumulative", 0))

        total_today_deposit += today_deposit
        total_today_cumulative += cumulative
        ld_deposit += data.get("ld_deposit", 0)
        ld_cumulative += data.get("ld_cumulative", 0)

        cdod = data.get("cdod", cdod)
        cwow = data.get("cwow", cwow)
        hdod = data.get("hdod", hdod)
        hwow = data.get("hwow", hwow)

        history_log.append({
            "time": f"{hour}:00",
            "amount": today_deposit,
            "hdod": hdod,
            "hwow": hwow,
            "cdod": cdod,
            "cwow": cwow
        })

    history_log.sort(key=lambda x: x["time"], reverse=True)

    return {
        "chart_hours": chart_hours,
        "today_values": today_values,
        "cumulative_values": cumulative_values,
        "last_day_values": last_day_values,
        "last_cumulative_values": last_cumulative_values,
        "history_log": history_log,
        "kpis": {
            "ld_deposit": ld_deposit,
            "ld_cumulative": ld_cumulative,
            "cdod": cdod,
            "cwow": cwow,
            "hdod": hdod,
            "hwow": hwow,
            "today_deposit": total_today_deposit,
            "today_cumulative": total_today_cumulative,
        }
    }

#for withdraw
def refactor_withdraw_data(docs, brand):
    chart_hours = []
    today_values = []
    cumulative_values = []
    last_day_values = []
    last_cumulative_values = []
    history_log = []

    total_today_deposit = 0
    total_today_cumulative = 0
    ld_deposit = 0
    ld_cumulative = 0
    cdod = 0
    cwow = 0
    hdod = 0
    hwow = 0

    for doc in docs:
        data = doc.to_dict()
        if data.get("brand") != brand:
            continue

        hour = doc.id
        chart_hours.append(f"{hour}:00")
        today_deposit = data.get("today_withdraw", 0)
        cumulative = data.get("today_cumulative", 0)

        today_values.append(today_deposit)
        cumulative_values.append(cumulative)
        last_day_values.append(data.get("ld_withdraw", 0))
        last_cumulative_values.append(data.get("ld_cumulative", 0))

        total_today_deposit += today_deposit
        total_today_cumulative += cumulative
        ld_deposit += data.get("ld_withdraw", 0)
        ld_cumulative += data.get("ld_cumulative", 0)

        cdod = data.get("cdod", cdod)
        cwow = data.get("cwow", cwow)
        hdod = data.get("hdod", hdod)
        hwow = data.get("hwow", hwow)

        history_log.append({
            "time": f"{hour}:00",
            "amount": today_deposit,
            "hdod": hdod,
            "hwow": hwow,
            "cdod": cdod,
            "cwow": cwow
        })

    history_log.sort(key=lambda x: x["time"], reverse=True)

    return {
        "chart_hours": chart_hours,
        "today_values": today_values,
        "cumulative_values": cumulative_values,
        "last_day_values": last_day_values,
        "last_cumulative_values": last_cumulative_values,
        "history_log": history_log,
        "kpis": {
            "ld_deposit": ld_deposit,
            "ld_cumulative": ld_cumulative,
            "cdod": cdod,
            "cwow": cwow,
            "hdod": hdod,
            "hwow": hwow,
            "today_deposit": total_today_deposit,
            "today_cumulative": total_today_cumulative,
        }
    }

#for pending deposits
def refactor_pending_deposit(docs, brand):
    chart_hours = []
    today_values = []
    history_log = []

    total_pending_amount = 0
    total_pending_count = 0
    average_pending_time = 0
    for doc in docs:
        data = doc.to_dict()
        if data.get("brand") != brand:
            continue

        hour = doc.id
        chart_hours.append(f"{hour}:00")

        pending_amount = data.get("pending_deposit_amount", 0)
        pending_count = data.get("pending_deposit_count", 0)
        avg_pending_time_raw = data.get("avg_pending_time", "0")
        try:
            average_pending_time = float(avg_pending_time_raw)
        except (ValueError, TypeError):
            average_pending_time = 0.0

        today_values.append(pending_amount)
        total_pending_amount += pending_amount
        total_pending_count += pending_count

        history_log.append({
            "time": f"{hour}:00",
            "amount": pending_amount,
            "count": pending_count,
            "avg_time": data.get("avg_pending_time", "N/A")
        })

    history_log.sort(key=lambda x: x["time"], reverse=True)

    return {
        "chart_hours": chart_hours,
        "today_values": today_values,
        "cumulative_values": [],
        "last_day_values": [],
        "last_cumulative_values": [],
        "history_log": history_log,
        "kpis": {
            "ld_deposit": 0,
            "ld_cumulative": 0,
            "cdod": 0,
            "cwow": 0,
            "hdod": 0,
            "hwow": 0,
            "today_deposit": 0,
            "today_cumulative": 0,
            "total_pending_deposit_amount": total_pending_amount,
            "total_pending_deposit_count": total_pending_count,
            "average_pending_time": average_pending_time
        }
        
    }

#for pending withdraw
def refactor_pending_withdraw(docs, brand):
    chart_hours = []
    today_values = []
    history_log = []

    total_pending_amount = 0
    total_pending_count = 0
    average_pending_time = 0
    for doc in docs:
        data = doc.to_dict()
        if data.get("brand") != brand:
            continue

        hour = doc.id
        chart_hours.append(f"{hour}:00")

        pending_amount = data.get("pending_withdraw_amount", 0)
        pending_count = data.get("pending_withdraw_count", 0)
        avg_pending_time_raw = data.get("avg_pending_time", "0")
        try:
            average_pending_time = float(avg_pending_time_raw)
        except (ValueError, TypeError):
            average_pending_time = 0.0

        today_values.append(pending_amount)
        total_pending_amount += pending_amount
        total_pending_count += pending_count

        history_log.append({
            "time": f"{hour}:00",
            "amount": pending_amount,
            "count": pending_count,
            "avg_time": data.get("avg_pending_time", "N/A")
        })

    history_log.sort(key=lambda x: x["time"], reverse=True)

    return {
        "chart_hours": chart_hours,
        "today_values": today_values,
        "cumulative_values": [],
        "last_day_values": [],
        "last_cumulative_values": [],
        "history_log": history_log,
        "kpis": {
            "ld_deposit": 0,
            "ld_cumulative": 0,
            "cdod": 0,
            "cwow": 0,
            "hdod": 0,
            "hwow": 0,
            "today_deposit": 0,
            "today_cumulative": 0,
            "total_pending_withdraw_amount": total_pending_amount,
            "total_pending_withdraw_count": total_pending_count,
            "average_pending_time": average_pending_time
        }
        
    }


def get_hourly_deposit_data(date: str, currency: str, brand: str, table: str):
    hourly_ref = db.collection(table).document(date).collection(currency)
    docs = list(hourly_ref.stream())
    if table == 'deposit':
        return refactor_deposit_data(docs, brand)
    elif table == 'withdraw':
        return refactor_withdraw_data(docs, brand)
    elif table == 'pendingdeposit':
        return refactor_pending_deposit(docs, brand)
    else:
        return refactor_pending_withdraw(docs, brand)