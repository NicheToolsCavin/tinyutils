# Quick Preview Smoke Curls

Use these after each preview deploy. Requires `PREVIEW_URL`, `PREVIEW_SECRET`, and a bypass `TOKEN`.

- Set bypass cookie:

```
curl -i "$PREVIEW_URL/api/convert?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=$TOKEN" -c cookies.txt
```

- Health:

```
curl -i -b cookies.txt "$PREVIEW_URL/api/convert/health"
```

- Convert:

```
curl -i -b cookies.txt -H "x-preview-secret: $PREVIEW_SECRET" -H "content-type: application/json" -d '{"inputs":[{"blobUrl":"data:text/plain;base64,SGVsbG8gVGlueVV0aWxzIQ==","name":"hello.md"}],"from":"markdown","to":["md"]}' "$PREVIEW_URL/api/convert"
```
