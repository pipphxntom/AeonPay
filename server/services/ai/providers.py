"""
AI provider abstraction for AeonPay AI Coach and Nudge systems.
Supports MockCoach (rule-based) and OpenAI-compatible providers (Qwen).
"""

import os
import json
import re
from typing import Dict, List, Any, Optional, Union
from abc import ABC, abstractmethod
import requests

class AIProvider(ABC):
    """Abstract base class for AI providers."""
    
    @abstractmethod
    def chat_completion(self, messages: List[Dict[str, str]], tools: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Generate chat completion with optional tool calls."""
        pass

class MockCoach(AIProvider):
    """Rule-based AI coach for development and fallback."""
    
    def __init__(self):
        self.rules = {
            "create_plan": {
                "keywords": ["plan", "create", "group", "budget", "spending"],
                "response": "I'll help you create a spending plan. Based on your request, here's what I suggest:",
                "tool": "create_plan"
            },
            "mint_vouchers": {
                "keywords": ["voucher", "mint", "prepaid", "fund"],
                "response": "I can mint vouchers for your group. Here's my recommendation:",
                "tool": "mint_vouchers"
            },
            "create_mandates": {
                "keywords": ["mandate", "limit", "cap", "control"],
                "response": "Let me set up mandates to control spending:",
                "tool": "create_mandates"
            },
            "suggest_merchants": {
                "keywords": ["merchant", "food", "canteen", "shop", "restaurant"],
                "response": "Here are some merchant suggestions based on your location:",
                "tool": "suggest_merchants"
            },
            "trim_suggestions": {
                "keywords": ["reduce", "trim", "lower", "cut", "save"],
                "response": "I can help you reduce spending. Here are my suggestions:",
                "tool": "trim_suggestions"
            }
        }
    
    def chat_completion(self, messages: List[Dict[str, str]], tools: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Generate rule-based responses with tool calls."""
        if not messages:
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": "Hello! I'm your AeonPay AI coach. How can I help you with your spending plans today?"
                    }
                }]
            }
        
        user_message = messages[-1].get("content", "").lower()
        
        # Find matching rule
        for rule_name, rule in self.rules.items():
            if any(keyword in user_message for keyword in rule["keywords"]):
                tool_call = None
                if tools:
                    # Generate appropriate tool call
                    tool_call = self._generate_tool_call(rule_name, user_message)
                
                response = {
                    "choices": [{
                        "message": {
                            "role": "assistant",
                            "content": rule["response"]
                        }
                    }]
                }
                
                if tool_call:
                    response["choices"][0]["message"]["tool_calls"] = [tool_call]
                
                return response
        
        # Default response
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "I can help you with creating plans, minting vouchers, setting up mandates, finding merchants, or trimming expenses. What would you like to do?"
                }
            }]
        }
    
    def _generate_tool_call(self, rule_name: str, user_message: str) -> Dict[str, Any]:
        """Generate appropriate tool call based on rule and user message."""
        tool_calls = {
            "create_plan": {
                "id": "call_create_plan",
                "type": "function",
                "function": {
                    "name": "create_plan",
                    "arguments": json.dumps({
                        "name": "AI Suggested Plan",
                        "cap_per_head": 300.0,
                        "duration_hours": 4,
                        "member_count": 3
                    })
                }
            },
            "mint_vouchers": {
                "id": "call_mint_vouchers",
                "type": "function", 
                "function": {
                    "name": "mint_vouchers",
                    "arguments": json.dumps({
                        "amount": 200.0,
                        "member_count": 3,
                        "expires_in_hours": 24
                    })
                }
            },
            "create_mandates": {
                "id": "call_create_mandates",
                "type": "function",
                "function": {
                    "name": "create_mandates", 
                    "arguments": json.dumps({
                        "cap_amount": 250.0,
                        "member_count": 3,
                        "valid_hours": 12
                    })
                }
            },
            "suggest_merchants": {
                "id": "call_suggest_merchants",
                "type": "function",
                "function": {
                    "name": "suggest_merchants",
                    "arguments": json.dumps({
                        "category": "food",
                        "max_results": 5
                    })
                }
            },
            "trim_suggestions": {
                "id": "call_trim_suggestions", 
                "type": "function",
                "function": {
                    "name": "trim_suggestions",
                    "arguments": json.dumps({
                        "current_amount": 400.0,
                        "target_reduction": 50.0
                    })
                }
            }
        }
        
        return tool_calls.get(rule_name)

class OpenAICompatible(AIProvider):
    """OpenAI-compatible provider for Qwen and other models."""
    
    def __init__(self):
        self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("QWEN_MODEL", "qwen2.5-7b-instruct")
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
    
    def chat_completion(self, messages: List[Dict[str, str]], tools: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Generate chat completion using OpenAI-compatible API."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        if tools:
            data["tools"] = tools
            data["tool_choice"] = "auto"
        
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.RequestException as e:
            # Fallback to mock response
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": f"I'm currently experiencing technical difficulties. Please try again later. (Error: {str(e)})"
                    }
                }]
            }

def get_ai_provider() -> AIProvider:
    """Get the configured AI provider instance."""
    if os.getenv("USE_MOCK_AI", "true").lower() == "true":
        return MockCoach()
    else:
        try:
            return OpenAICompatible()
        except ValueError:
            # Fallback to mock if OpenAI is not configured
            return MockCoach()

# PII Redaction utilities
def redact_pii(text: str, user_data: Dict[str, Any]) -> tuple[str, Dict[str, str]]:
    """
    Redact PII from text before sending to AI.
    Returns (redacted_text, token_map) where token_map can restore original values.
    """
    token_map = {}
    redacted_text = text
    
    # Redact phone numbers
    phone_pattern = r'\+?\d{10,15}'
    phones = re.findall(phone_pattern, text)
    for i, phone in enumerate(phones):
        token = f"<PHONE_TOKEN_{i}>"
        token_map[token] = phone
        redacted_text = redacted_text.replace(phone, token)
    
    # Redact names (if provided in user_data)
    if user_data.get('name'):
        name = user_data['name']
        token = "<NAME_TOKEN>"
        token_map[token] = name
        redacted_text = redacted_text.replace(name, token)
    
    # Redact UPI IDs
    upi_pattern = r'[\w\.-]+@[\w\.-]+'
    upis = re.findall(upi_pattern, text)
    for i, upi in enumerate(upis):
        token = f"<UPI_TOKEN_{i}>"
        token_map[token] = upi
        redacted_text = redacted_text.replace(upi, token)
    
    return redacted_text, token_map

def restore_pii(text: str, token_map: Dict[str, str]) -> str:
    """Restore PII from redacted text using token map."""
    restored_text = text
    for token, original_value in token_map.items():
        restored_text = restored_text.replace(token, original_value)
    return restored_text

def validate_tool_calls(tool_calls: List[Dict], allowed_tools: List[str]) -> List[Dict]:
    """Validate and filter tool calls to ensure only allowed tools are called."""
    validated_calls = []
    
    for call in tool_calls:
        if call.get("function", {}).get("name") in allowed_tools:
            # Additional validation: ensure no direct fund transfers
            function_name = call["function"]["name"]
            arguments = call["function"].get("arguments", {})
            
            if isinstance(arguments, str):
                try:
                    arguments = json.loads(arguments)
                except json.JSONDecodeError:
                    continue
            
            # Reject any tool calls that attempt direct fund movement outside allowed tools
            if "transfer" in function_name.lower() or "send" in function_name.lower():
                continue
                
            validated_calls.append(call)
    
    return validated_calls