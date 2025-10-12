# Testing TinyUtils

The project is static with Edge functions, so the only automated check is verifying the Vercel build hook:

```bash
npm run vercel-build
```

This echoes `static + edge`, confirming the configuration that Vercel expects.
