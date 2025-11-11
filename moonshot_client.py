#!/usr/bin/env python3
"""
Moonshot AI API Client Configuration and Example Usage with Rate Limiting
"""

import os
import json
import time
import requests
from pathlib import Path
from datetime import datetime, timedelta
import threading

class RateLimiter:
    """Simple rate limiter to prevent exceeding API limits"""
    
    def __init__(self, requests_per_minute=10):
        self.requests_per_minute = requests_per_minute
        self.requests = []
        self.lock = threading.Lock()
    
    def wait_if_needed(self):
        """Wait if we're making requests too quickly"""
        with self.lock:
            now = datetime.now()
            
            # Remove old requests that are outside the window
            self.requests = [req_time for req_time in self.requests if now - req_time < timedelta(minutes=1)]
            
            # If we've hit the limit, wait until we're under the limit
            if len(self.requests) >= self.requests_per_minute:
                oldest = min(self.requests)
                wait_time = 60 - (now - oldest).seconds
                if wait_time > 0:
                    time.sleep(wait_time)
                    # Refresh the list after waiting
                    now = datetime.now()
                    self.requests = [req_time for req_time in self.requests if now - req_time < timedelta(minutes=1)]
            
            # Record this request
            self.requests.append(now)


class MoonshotAPIClient:
    def __init__(self, api_key=None, base_url=None, requests_per_minute=10):
        """
        Initialize the Moonshot API client
        
        Args:
            api_key (str): Your Moonshot API key. If not provided, will try to read from environment
            base_url (str): Base URL for the API. Defaults to https://api.moonshot.cn/v1
            requests_per_minute (int): Rate limit for requests per minute (default: 10)
        """
        self.api_key = api_key or os.getenv('MOONSHOT_API_KEY')
        self.base_url = base_url or os.getenv('MOONSHOT_BASE_URL', 'https://api.moonshot.cn/v1')
        self.rate_limiter = RateLimiter(requests_per_minute)
        
        if not self.api_key:
            raise ValueError("Moonshot API key is required. Set MOONSHOT_API_KEY environment variable.")
    
    def _make_request(self, endpoint, data):
        """Make a request to the Moonshot API with rate limiting"""
        # Wait if needed to respect rate limits
        self.rate_limiter.wait_if_needed()
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(f'{self.base_url}{endpoint}', headers=headers, json=data)
        
        # Handle rate limit responses from the API
        if response.status_code == 429:
            print("Rate limit exceeded. Waiting before retry...")
            time.sleep(10)  # Wait 10 seconds before retrying
            # Make the request again
            response = requests.post(f'{self.base_url}{endpoint}', headers=headers, json=data)
        
        response.raise_for_status()
        return response.json()
    
    def chat_completion(self, messages, model='moonshot-v1-8k', temperature=0.3, **kwargs):
        """
        Generate a chat completion using the Moonshot API
        
        Args:
            messages (list): List of message objects with 'role' and 'content'
            model (str): Model to use (default: moonshot-v1-8k)
            temperature (float): Controls randomness (default: 0.3)
            **kwargs: Additional parameters to pass to the API
        
        Returns:
            dict: API response
        """
        data = {
            'model': model,
            'messages': messages,
            'temperature': temperature,
            **kwargs
        }
        
        return self._make_request('/chat/completions', data)
    
    def set_rate_limit(self, requests_per_minute):
        """Update the rate limit for requests per minute"""
        self.rate_limiter.requests_per_minute = requests_per_minute
    
    def load_config_from_file(self, config_file):
        """Load configuration from a JSON file"""
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        self.api_key = config.get('api_key', self.api_key)
        self.base_url = config.get('service_url', self.base_url)
        
        # Get rate limit from config if available, default to 10
        rate_limit = config.get('rate_limit_per_minute', 10)
        self.rate_limiter.requests_per_minute = rate_limit
        
        if not self.api_key:
            raise ValueError("API key not found in config file")


def load_env_file(env_file_path):
    """Load environment variables from a .env file"""
    if not os.path.exists(env_file_path):
        return
    
    with open(env_file_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()


def main():
    # Load environment variables from .env file if it exists
    env_file = os.path.expanduser('~/dev/TinyUtils/.env.moonshot')
    if os.path.exists(env_file):
        load_env_file(env_file)
    
    # Initialize the client with rate limiting
    try:
        # Get rate limit from environment variable or default to 10
        rate_limit = int(os.getenv('MOONSHOT_RATE_LIMIT', 10))
        # Default to 10 requests per minute to be conservative
        client = MoonshotAPIClient(requests_per_minute=rate_limit)
        
        # Example usage
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello, how are you?"}
        ]
        
        print("Making request to Moonshot API...")
        response = client.chat_completion(messages)
        print("Response from Moonshot API:")
        print(json.dumps(response, indent=2, ensure_ascii=False))
        
    except ValueError as e:
        print(f"Error: {e}")
        print("\nTo set up your Moonshot API key:")
        print("1. Get your API key from: https://platform.moonshot.ai/account/api-keys")
        print("2. Set the MOONSHOT_API_KEY environment variable:")
        print("   export MOONSHOT_API_KEY='your_actual_api_key_here'")
        print("   Or add it to your .env.moonshot file")


if __name__ == "__main__":
    main()