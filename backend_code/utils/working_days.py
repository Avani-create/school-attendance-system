from datetime import date, timedelta
from typing import List, Set
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Holiday

async def get_working_dates(db: AsyncSession, start_date: date, end_date: date) -> List[date]:
    """
    Returns a list of all working dates between start_date and end_date (inclusive).
    Sundays are always excluded.
    Saturdays are excluded unless explicitly marked as is_working_saturday = True.
    Weekdays (Mon-Fri) are included unless marked as a holiday (is_working_saturday = False).
    """
    if start_date > end_date:
        return []

    # Fetch holidays/working Saturdays within range
    stmt = select(Holiday).where(Holiday.date.between(start_date, end_date))
    result = await db.execute(stmt)
    holidays = result.scalars().all()

    # Build lookup maps
    working_saturdays: Set[date] = {h.date for h in holidays if h.is_working_saturday}
    regular_holidays: Set[date] = {h.date for h in holidays if not h.is_working_saturday}

    working_dates = []
    current_date = start_date
    delta = timedelta(days=1)

    while current_date <= end_date:
        weekday = current_date.weekday() # 0 = Monday, ..., 5 = Saturday, 6 = Sunday

        if weekday == 6:
            # Sunday is always excluded
            pass
        elif weekday == 5:
            # Saturday is excluded unless it is explicitly marked as a working Saturday
            if current_date in working_saturdays:
                working_dates.append(current_date)
        else:
            # Monday to Friday are included unless they are a regular holiday
            if current_date not in regular_holidays:
                working_dates.append(current_date)

        current_date += delta

    return working_dates

async def get_working_days_count(db: AsyncSession, start_date: date, end_date: date) -> int:
    """
    Returns the count of working days between start_date and end_date.
    """
    working_dates = await get_working_dates(db, start_date, end_date)
    return len(working_dates)
