import pytest
import httpx
from fastapi.testclient import TestClient
from main import app
from database import get_db_session, create_tables
from seed_data import seed_database
import uuid

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_test_db():
    """Setup test database"""
    create_tables()
    seed_database()
    yield
    # Cleanup if needed

def get_auth_token():
    """Get auth token for testing"""
    response = client.post("/api/auth/mock_login", json={"phone": "+91 9876543210"})
    assert response.status_code == 200
    return response.json()["token"]

class TestIdempotency:
    """Test idempotency functionality"""
    
    def test_idempotent_plan_creation(self, setup_test_db):
        """Test that plan creation is idempotent"""
        token = get_auth_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "idempotency-key": str(uuid.uuid4())
        }
        
        plan_data = {
            "name": "Test Idempotent Plan",
            "cap_per_head": 250.0,
            "window_start": "2024-12-25T18:00:00",
            "window_end": "2024-12-25T22:00:00",
            "merchant_whitelist": ["merchant-campus-1-0"],
            "member_ids": ["user-2", "user-3"]
        }
        
        # First request
        response1 = client.post("/api/plans/", json=plan_data, headers=headers)
        assert response1.status_code == 200
        plan_id_1 = response1.json()["plan"]["id"]
        
        # Second request with same idempotency key
        response2 = client.post("/api/plans/", json=plan_data, headers=headers)
        assert response2.status_code == 200
        plan_id_2 = response2.json()["plan"]["id"]
        
        # Should return same plan
        assert plan_id_1 == plan_id_2

class TestVoucherRedemption:
    """Test voucher redemption with multiple legs"""
    
    def test_voucher_redeem_splits_correctly(self, setup_test_db):
        """Test that voucher redemption splits into correct number of legs"""
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # First create vouchers
        voucher_data = {
            "plan_id": "plan-demo-1",
            "member_user_ids": ["user-1", "user-2", "user-3"],
            "amount": 100.0,
            "merchant_list": [],
            "expires_at": "2024-12-31T23:59:59"
        }
        
        voucher_response = client.post("/api/vouchers/mint", json=voucher_data, headers=headers)
        assert voucher_response.status_code == 200
        vouchers = voucher_response.json()["vouchers"]
        assert len(vouchers) == 3
        
        # Redeem vouchers
        redemption_data = {
            "voucher_ids": [v["id"] for v in vouchers[:2]],  # Redeem 2 out of 3
            "amounts": [50.0, 75.0],
            "merchant_id": "merchant-campus-1-0"
        }
        
        redemption_response = client.post("/api/vouchers/redeem", json=redemption_data, headers=headers)
        assert redemption_response.status_code == 200
        
        result = redemption_response.json()["result"]
        assert result["total_redeemed"] == 2
        assert result["total_failed"] == 0
        assert len(result["redeemed"]) == 2

class TestGuardrails:
    """Test over-cap guardrail functionality"""
    
    def test_over_cap_returns_guardrail_flag(self, setup_test_db):
        """Test that over-cap amount triggers guardrail"""
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create payment intent with high amount (triggers guardrail)
        intent_data = {
            "amount": 500.0,  # Over the 250 threshold
            "merchant_id": "merchant-campus-1-0",
            "plan_id": "plan-demo-1",
            "mode": "vouchers"
        }
        
        response = client.post("/api/payments/intent", json=intent_data, headers=headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "guardrail_required" in result
        assert result["guardrail_required"] is True
        
        # Test with normal amount (no guardrail)
        intent_data["amount"] = 150.0
        response = client.post("/api/payments/intent", json=intent_data, headers=headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["guardrail_required"] is False

class TestAuthentication:
    """Test authentication flows"""
    
    def test_mock_login_creates_user(self, setup_test_db):
        """Test that mock login creates new user if doesn't exist"""
        new_phone = "+91 9999999999"
        
        response = client.post("/api/auth/mock_login", json={"phone": new_phone})
        assert response.status_code == 200
        
        result = response.json()
        assert "token" in result
        assert "user" in result
        assert result["user"]["phone"] == new_phone
        assert result["user"]["name"] == "User 9999"  # Generated name
        
    def test_protected_route_requires_auth(self, setup_test_db):
        """Test that protected routes require authentication"""
        response = client.get("/api/me/plans")
        assert response.status_code == 401

class TestMerchants:
    """Test merchant endpoints"""
    
    def test_get_merchants_by_campus(self, setup_test_db):
        """Test filtering merchants by campus"""
        response = client.get("/api/merchants?campus_id=campus-1")
        assert response.status_code == 200
        
        merchants = response.json()
        assert len(merchants) == 20  # 20 merchants per campus
        assert all(m["campus_id"] == "campus-1" for m in merchants)
        
    def test_get_merchants_by_category(self, setup_test_db):
        """Test filtering merchants by category"""
        response = client.get("/api/merchants?category=food")
        assert response.status_code == 200
        
        merchants = response.json()
        assert all(m["category"] == "food" for m in merchants)

class TestPlans:
    """Test plan management"""
    
    def test_create_and_retrieve_plan(self, setup_test_db):
        """Test creating and retrieving a plan"""
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        plan_data = {
            "name": "Test Plan",
            "cap_per_head": 300.0,
            "window_start": "2024-12-25T18:00:00",
            "window_end": "2024-12-25T22:00:00",
            "merchant_whitelist": ["merchant-campus-1-0", "merchant-campus-1-1"],
            "member_ids": ["user-2", "user-3"]
        }
        
        # Create plan
        response = client.post("/api/plans/", json=plan_data, headers=headers)
        assert response.status_code == 200
        
        created_plan = response.json()["plan"]
        plan_id = created_plan["id"]
        
        # Retrieve plan
        response = client.get(f"/api/plans/{plan_id}", headers=headers)
        assert response.status_code == 200
        
        retrieved_plan = response.json()
        assert retrieved_plan["name"] == plan_data["name"]
        assert float(retrieved_plan["cap_per_head"]) == plan_data["cap_per_head"]

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
