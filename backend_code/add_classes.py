import asyncio
from database import AsyncSessionLocal
from models import TeacherClass
from sqlalchemy import select

async def add_classes():
    async with AsyncSessionLocal() as db:
        # Check existing classes
        result = await db.execute(select(TeacherClass))
        existing = result.scalars().all()
        existing_names = [c.class_name for c in existing]
        print(f"Existing classes: {existing_names}")
        
        # Add new classes with teacher_id = 1 (admin)
        new_classes = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B", "5A"]
        added_count = 0
        for cls_name in new_classes:
            if cls_name not in existing_names:
                new_class = TeacherClass(
                    teacher_id=1,  # Admin teacher ID
                    class_name=cls_name
                )
                db.add(new_class)
                print(f"➕ Added class: {cls_name}")
                added_count += 1
        
        await db.commit()
        print(f"\n✅ Added {added_count} classes!")
        
        # Verify
        result = await db.execute(select(TeacherClass))
        all_classes = result.scalars().all()
        print(f"\n📚 Total classes in teacher_classes: {len(all_classes)}")
        for c in all_classes:
            print(f"  - {c.class_name}")

asyncio.run(add_classes())