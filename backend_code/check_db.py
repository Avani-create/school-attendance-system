import asyncio
from database import AsyncSessionLocal
from sqlalchemy import text

async def check_db():
    async with AsyncSessionLocal() as db:
        # Check teacher_classes table
        result = await db.execute(text("SELECT * FROM teacher_classes"))
        rows = result.fetchall()
        print(f"📚 teacher_classes entries: {len(rows)}")
        for row in rows:
            print(f"  - {row}")
        
        # Check students table for distinct classes
        result = await db.execute(text("SELECT DISTINCT class FROM students"))
        rows = result.fetchall()
        print(f"\n👨‍🎓 Student classes: {len(rows)}")
        for row in rows:
            print(f"  - {row[0]}")

asyncio.run(check_db())