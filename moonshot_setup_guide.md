# Moonshot AI API Configuration Setup

This guide explains how to set up the Moonshot AI API with your code_config_hacks platform.

## Getting Started

1. **Get Your API Key**
   - Visit [Moonshot AI Platform](https://platform.moonshot.ai)
   - Navigate to Account → API Keys
   - Create a new API key

2. **Configuration Options**

   You have several options for storing your API key:

   ### Option 1: Environment Variables
   Add to your shell profile (`.bashrc`, `.zshrc`, etc.):
   ```bash
   export MOONSHOT_API_KEY='your_api_key_here'
   ```

   ### Option 2: Environment File
   Copy the provided `.env.moonshot` template:
   ```bash
   cp .env.moonshot ~/.env.moonshot
   # Edit the file to add your actual API key
   vim ~/.env.moonshot
   ```

   ### Option 3: Configuration File
   Create a JSON configuration file at `~/.code-moonshot/auth.json`:
   ```json
   {
     "api_key": "your_actual_api_key_here",
     "service_url": "https://api.moonshot.cn/v1",
     "models": [
       "moonshot-v1-8k",
       "moonshot-v1-32k", 
       "moonshot-v1-128k"
     ],
     "default_model": "moonshot-v1-8k"
   }
   ```

3. **Integration with code_config_hacks**

   To integrate with the existing code_config_hacks structure:

   ```bash
   # Create the directory structure
   mkdir -p ~/dev/CodeProjects/code_config_hacks/.code-moonshot

   # Create auth file
   cat > ~/dev/CodeProjects/code_config_hacks/.code-moonshot/auth.json << EOF
   {
     "api_key": "your_actual_api_key_here",
     "service_url": "https://api.moonshot.cn/v1",
     "models": [
       "moonshot-v1-8k",
       "moonshot-v1-32k", 
       "moonshot-v1-128k"
     ],
     "default_model": "moonshot-v1-8k"
   }
   EOF
   ```

4. **Python Client Usage**

   Use the provided Python client to interact with the API:

   ```python
   from moonshot_client import MoonshotAPIClient

   # Initialize client (will use environment variable or config file)
   client = MoonshotAPIClient()

   # Make a request
   messages = [
       {"role": "system", "content": "You are a helpful assistant."},
       {"role": "user", "content": "Hello, how are you?"}
   ]

   response = client.chat_completion(messages)
   print(response)
   ```

## API Endpoints

- Base URL: `https://api.moonshot.cn/v1`
- Chat completions: `POST /v1/chat/completions`

## Available Models

- `kimi-k2-turbo-preview`: Moonshot AI's most advanced model ("best model in the world"), with superior reasoning capabilities (likely premium pricing/rate limits)
- `moonshot-v1-8k`: For short conversations and quick responses
- `moonshot-v1-32k`: For medium-length content like documents
- `moonshot-v1-128k`: For large content like long documents or books

## Rate Limiting

The configuration includes rate limiting to prevent exceeding API limits:

- Default rate limit: 10 requests per minute (configurable)
- Rate limiting is implemented both client-side and respects server-side limits
- The system will automatically wait when approaching rate limits

To adjust the rate limit:

### In Configuration File
```json
{
  "api_key": "your_actual_api_key_here",
  "service_url": "https://api.moonshot.cn/v1",
  "rate_limit_per_minute": 30  // Adjust as needed
}
```

### In Environment Variables
```bash
export MOONSHOT_RATE_LIMIT=30  // Requests per minute
```

## Rate Limits and Pricing

Based on typical API service models, here's what you can likely expect with Moonshot AI:

### Model Tiers and Rate Limits
Moonshot AI offers several models including their newest flagship:
- **kimi-k2-turbo-preview**: The most advanced Kimi model, likely their "best model in the world" 
- **moonshot-v1-8k**: Short context model, highest rate limit
- **moonshot-v1-32k**: Medium context model, moderate rate limit  
- **moonshot-v1-128k**: Long context model, lower rate limit (the "best" model for long context)

### Estimated Rate Limits
- With a $5 recharge, you can likely expect:
  - **kimi-k2-turbo-preview**: ~50-200 requests per minute (most restrictive due to being their premium model)
  - **moonshot-v1-8k**: ~1,000-2,000 requests per minute (or ~200,000-400,000 tokens per minute)
  - **moonshot-v1-32k**: ~500-1,000 requests per minute (or ~100,000-200,000 tokens per minute)
  - **moonshot-v1-128k**: ~100-300 requests per minute (or ~50,000-100,000 tokens per minute)

The **kimi-k2-turbo-preview** is reportedly their most advanced model with superior reasoning capabilities, likely making it the premium offering with the strictest rate limits but best performance.

### Cost Considerations
- Pricing is typically tiered based on token usage (input + output tokens)
- The kimi-k2-turbo-preview model will likely consume the most credits per token
- The 128k model will consume more credits per token than shorter context models
- $5 would typically provide between 2-5 million tokens total depending on which model you use

### Rate Limiting Notes
- Rate limits may also be expressed in "requests per minute" and "tokens per minute"
- There may be daily/monthly quotas in addition to rate limits
- Best practice is to implement client-side rate limiting as I've included in the configuration

**Note: Since Moonshot's official pricing documentation is not readily accessible, these are estimates based on similar large language model APIs. For exact pricing and rate limits, please check the Moonshot AI dashboard after registration.**

## Security Best Practices

- Keep your API key secure and never expose it in client-side code
- Use environment variables to store API keys
- Rotate your API keys regularly
- Do not commit API keys to version control

## Testing Your Setup

You can test your API key by running:

```bash
python3 -c "
import os
# Load your API key
os.environ['MOONSHOT_API_KEY'] = 'your_actual_api_key_here'

from moonshot_client import MoonshotAPIClient
client = MoonshotAPIClient()
messages = [{'role': 'user', 'content': 'Hello'}]
response = client.chat_completion(messages)
print('Success! API is working.')
"
```

## Troubleshooting

- If you get authentication errors, verify your API key is correct
- Check that your environment variables are properly set
- Ensure you have internet connectivity to reach `https://api.moonshot.cn/v1`