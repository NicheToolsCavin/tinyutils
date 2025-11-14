# Google Cloud — Cost Safety Checklist (v2025-11-14)

Goal
- Prevent accidental spend. Only allow services we use; cap/disable everything else; ensure nothing runs idle.

Scope
- Cloud Run (external PDF renderer, if used), Cloud Storage (artifacts), Cloud Scheduler/Tasks/PubSub (if any), IAM, Billing budgets/alerts, VPC egress, Cloud Build triggers.

Quick Outcomes
- No idle instances (min instances = 0). Hard caps on max instances. Budgets + alerts. Principle-of-least-privilege IAM. Secrets outside repo. Region scoping.

## 1) Billing Guardrails
- Set budgets with 3 thresholds (e.g., 25%, 50%, 75%) and email + Pub/Sub notifications (optional).
- Enable billing export to BigQuery or Cloud Storage (daily) for visibility.

Example
```bash
# Replace placeholders: <BILLING_ACCOUNT>, <PROJECT_ID>
gcloud beta billing budgets create \
  --billing-account=<BILLING_ACCOUNT> \
  --display-name="TinyUtils Budget" \
  --budget-amount=50 \
  --threshold-rule=percent=0.25 \
  --threshold-rule=percent=0.50 \
  --threshold-rule=percent=0.75 \
  --all-updates-rule-pubsub-topic=<OPTIONAL_PUBSUB_TOPIC> \
  --all-updates-rule-monitoring-notification-channels=<OPTIONAL_MONITORING_CHANNEL>
```

## 2) Cloud Run (External PDF Renderer)
- Min instances = 0.
- Max instances: 2–3 (raise temporarily if load-testing).
- Concurrency: 10–40 depending on endpoint cost.
- CPU allocation: during request only.
- Request timeout: ≤ 30–60s.
- Egress: restrict with VPC egress rules if possible; otherwise code-level allowlist.
- AuthN: private by default; require `x-shared-secret` or IAM (invoker) + Cloud Armor/IP allowlist.
- Logging: redact secrets; sample at 100% initially.

Commands
```bash
# Example: harden a service
SERVICE=pdf-renderer
PROJECT=<PROJECT_ID>
REGION=<REGION>

gcloud run services update $SERVICE \
  --project=$PROJECT --region=$REGION \
  --min-instances=0 --max-instances=3 \
  --concurrency=20 --cpu-throttling \
  --timeout=30s --no-allow-unauthenticated

# Optionally enable only authenticated invokers
gcloud run services add-iam-policy-binding $SERVICE \
  --member=serviceAccount:<SERVICE_ACCOUNT>@$PROJECT.iam.gserviceaccount.com \
  --role=roles/run.invoker
```

## 3) Secrets & IAM
- Use Secret Manager for `CONVERTER_SHARED_SECRET`, API keys; never commit.
- Least privilege for service accounts (`roles/run.invoker` only where needed).
- Rotate secrets quarterly; track in SECURITY_ROTATION_PLAYBOOK.md.

## 4) Scheduler / Tasks / PubSub
- Disable or delete unused jobs/topics/queues.
- If used: set rate limits, retry caps, and max delivery attempts.

## 5) Storage & Lifecycle
- Buckets private; enforce uniform bucket-level access.
- Lifecycle rules: auto-delete objects older than N days for scratch/artifacts.
- No public listing; signed URLs only if needed.

## 6) Networking
- Deny private/loopback in app code for outbound fetches (already enforced in Edge APIs).
- Optional: Cloud Armor to geo/IP restrict PDF renderer.

## 7) Monitoring & Alerts
- Uptime checks for critical endpoints (PDF renderer /convert).
- Log-based metrics:
  - Count of 5xx responses.
  - Count of unauthenticated invocations.
  - Spend anomaly alerts via budget notifications.

## 8) Daily/Weekly Hygiene
- Daily: `gcloud run services list` ensure no unexpected services; `gcloud tasks queues list`; `gcloud scheduler jobs list`.
- Weekly: review logs for spikes; confirm zero min-instances across services; check budget email summaries.

## 9) Decommission Strategy
- When feature unused: scale to zero, remove triggers, delete service after 7d quiet period.

## 10) Tie-in to Code
- The converter prefers external Chromium via `PDF_RENDERER_URL` + `CONVERTER_SHARED_SECRET`.
- If URL unset: local ReportLab fallback runs in Vercel (no GCP cost).
- Keep external endpoint private and rate-limited; set `--max-instances` to prevent runaway costs.

Appendix: Audit Script
- See `scripts/gcp_cost_guard.sh` for a guided, read-only audit. Escalate to write actions after review.

