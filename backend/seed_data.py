from database import get_db_session
from models import User, Campus, Merchant, Plan, PlanMember
import uuid
from datetime import datetime, timedelta

def seed_database():
    """Seed database with initial data"""
    db = get_db_session()
    
    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already seeded")
            return
        
        print("Seeding database...")
        
        # Seed campuses
        campuses = []
        campus_data = [
            {"name": "Tech Campus North", "location": "Sector 62, Noida"},
            {"name": "Business Campus Central", "location": "Connaught Place, Delhi"},
            {"name": "Arts Campus South", "location": "Hauz Khas, Delhi"}
        ]
        
        for i, campus_info in enumerate(campus_data):
            campus = Campus(
                id=f"campus-{i+1}",
                name=campus_info["name"],
                location=campus_info["location"]
            )
            campuses.append(campus)
            db.add(campus)
        
        # Seed merchants (20 per campus)
        merchant_data = [
            {"name": "Chai Point", "category": "beverages", "icon": "☕"},
            {"name": "Pizza Corner", "category": "food", "icon": "🍕"},
            {"name": "Sandwich Station", "category": "food", "icon": "🥪"},
            {"name": "Juice Bar", "category": "beverages", "icon": "🥤"},
            {"name": "Canteen Central", "category": "food", "icon": "🍽️"},
            {"name": "Coffee Bean", "category": "beverages", "icon": "☕"},
            {"name": "Rolls & Wraps", "category": "food", "icon": "🌯"},
            {"name": "Fresh Fruits", "category": "snacks", "icon": "🍎"},
            {"name": "Ice Cream Parlor", "category": "desserts", "icon": "🍦"},
            {"name": "Bakery Corner", "category": "snacks", "icon": "🥐"},
            {"name": "Noodle House", "category": "food", "icon": "🍜"},
            {"name": "Tea Stall", "category": "beverages", "icon": "🫖"},
            {"name": "Burger Junction", "category": "food", "icon": "🍔"},
            {"name": "Smoothie Bar", "category": "beverages", "icon": "🥤"},
            {"name": "Snack Attack", "category": "snacks", "icon": "🍿"},
            {"name": "Sweet Shop", "category": "desserts", "icon": "🍬"},
            {"name": "Pasta Place", "category": "food", "icon": "🍝"},
            {"name": "Lemon Water", "category": "beverages", "icon": "🍋"},
            {"name": "Chips & More", "category": "snacks", "icon": "🥨"},
            {"name": "Cake Corner", "category": "desserts", "icon": "🎂"}
        ]
        
        for campus in campuses:
            for i, merchant_info in enumerate(merchant_data):
                merchant = Merchant(
                    id=f"merchant-{campus.id}-{i}",
                    name=merchant_info["name"],
                    category=merchant_info["category"],
                    campus_id=campus.id,
                    icon=merchant_info["icon"],
                    location=f"Shop {i+1}, {campus.name}"
                )
                db.add(merchant)
        
        # Seed users
        user_data = [
            {"phone": "+91 9876543210", "name": "John Doe", "email": "john.doe@example.com"},
            {"phone": "+91 9876543211", "name": "Jane Smith", "email": "jane.smith@example.com"},
            {"phone": "+91 9876543212", "name": "Alice Johnson", "email": "alice.johnson@example.com"},
            {"phone": "+91 9876543213", "name": "Bob Wilson", "email": "bob.wilson@example.com"},
            {"phone": "+91 9876543214", "name": "Carol Brown", "email": "carol.brown@example.com"},
            {"phone": "+91 9876543215", "name": "David Lee", "email": "david.lee@example.com"},
            {"phone": "+91 9876543216", "name": "Emma Davis", "email": "emma.davis@example.com"},
            {"phone": "+91 9876543217", "name": "Frank Miller", "email": "frank.miller@example.com"}
        ]
        
        users = []
        for i, user_info in enumerate(user_data):
            user = User(
                id=f"user-{i+1}",
                phone=user_info["phone"],
                name=user_info["name"],
                email=user_info["email"]
            )
            users.append(user)
            db.add(user)
        
        # Commit users and campuses first
        db.commit()
        
        # Seed demo plans
        now = datetime.utcnow()
        
        # Plan 1: Birthday Party
        plan1 = Plan(
            id="plan-demo-1",
            name="Birthday Party",
            cap_per_head=300.00,
            window_start=now + timedelta(hours=2),
            window_end=now + timedelta(hours=8),
            merchant_whitelist=["merchant-campus-1-0", "merchant-campus-1-1", "merchant-campus-1-8"],
            status="active",
            created_by="user-1"
        )
        db.add(plan1)
        
        # Plan 2: Movie Night  
        plan2 = Plan(
            id="plan-demo-2",
            name="Movie Night",
            cap_per_head=200.00,
            window_start=now + timedelta(hours=1),
            window_end=now + timedelta(hours=5),
            merchant_whitelist=["merchant-campus-1-2", "merchant-campus-1-3", "merchant-campus-1-14"],
            status="active",
            created_by="user-2"
        )
        db.add(plan2)
        
        # Add plan members
        plan_members = [
            # Plan 1 members
            {"plan_id": "plan-demo-1", "user_id": "user-1"},
            {"plan_id": "plan-demo-1", "user_id": "user-2"},
            {"plan_id": "plan-demo-1", "user_id": "user-3"},
            {"plan_id": "plan-demo-1", "user_id": "user-4"},
            {"plan_id": "plan-demo-1", "user_id": "user-5"},
            # Plan 2 members
            {"plan_id": "plan-demo-2", "user_id": "user-2"},
            {"plan_id": "plan-demo-2", "user_id": "user-6"},
            {"plan_id": "plan-demo-2", "user_id": "user-7"},
            {"plan_id": "plan-demo-2", "user_id": "user-8"},
        ]
        
        for i, member_info in enumerate(plan_members):
            member = PlanMember(
                id=f"member-{i+1}",
                plan_id=member_info["plan_id"],
                user_id=member_info["user_id"],
                state="active"
            )
            db.add(member)
        
        db.commit()
        print("Database seeded successfully!")
        
        # Print summary
        print(f"Created:")
        print(f"- {len(campuses)} campuses")
        print(f"- {len(campuses) * len(merchant_data)} merchants")
        print(f"- {len(users)} users")
        print(f"- 2 demo plans")
        print(f"- {len(plan_members)} plan members")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    from database import create_tables
    create_tables()
    seed_database()
