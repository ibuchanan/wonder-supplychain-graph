# Specification Document: Enterprise Cross-Tenant Event Engine for Atlassian Forge

**Document Status:** Revised Draft

**Target Architecture:** Multi-Tenant Atlassian Forge Applications (Blue Site $\leftrightarrow$ Peer Sites)

**Core Technologies:** CloudEvents v1.0, AsyncAPI 3.0, Atlassian Teamwork Graph (TWG) Connectors, AWS Serverless Infrastructure (API Gateway, EventBridge, SQS, Kinesis Firehose)

---

## 1. Executive Summary & Core Principles

This specification defines a **zero-trust, enterprise-compliant event streaming architecture** for Atlassian Forge applications crossing customer site boundaries (e.g., "Blue Site" to "Green Site").

Instead of passing heavy product objects through third-party streaming compute or managing fragile cross-tenant OAuth callbacks, this design decouples **context synchronization** from **real-time signaling**:

1. **Context Layer (Teamwork Graph):** Blue Site uses Teamwork Graph Connectors to ingest a "simplified double" (External Work Item mirror) directly into Green Site's Atlassian workspace.
2. **Signaling Layer (AWS EventBridge + CloudEvents):** Blue Site emits a **Lean CloudEvent** (~500 bytes, stripped of PII/sensitive fields) over AWS serverless infrastructure to trigger Green Site's Forge Webtrigger.
3. **Local Resolution:** Green Site responds to real-time events by querying its **local** Teamwork Graph, completely eliminating cross-tenant REST API callbacks.

---

## 2. High-Level Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TENANT A: BLUE SITE (Source Forge App)                                         │
│                                                                                 │
│ 1. [Jira Lifecycle Event]                                                       │
│      ├───> Ingests "Simplified Double" ───> [Green Site Teamwork Graph Engine]   │
│      │                                                                          │
│      └───> Formats Lean CloudEvent ───> [Forge Remote POST]                     │
└──────────────────────────────────────────┬──────────────────────────────────────┘
                                           │ (Crosses Tenant Boundary)
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE LAYER: AWS SERVERLESS PIPELINE                                   │
│                                                                                 │
│ 2. [Amazon API Gateway (HTTP API Ingest)]                                       │
│      │                                                                          │
│      ▼                                                                          │
│ 3. [Amazon EventBridge (Custom Event Bus)]                                      │
│      ├─ Rule A: Audit Stream ──> [Kinesis Firehose] ──> [Amazon S3 Bucket]      │
│      │                                                                          │
│      └─ Rule B: Tenant Filter Match                                             │
│            │                                                                    │
│            ▼                                                                    │
│ 4. [Amazon SQS Queue] (Rate-Limit Smoothing Buffer)                             │
│            │                                                                    │
│            ▼                                                                    │
│ 5. [EventBridge API Destination] (Throttled HTTPS Delivery: Max 15 req/sec)     │
└──────────────────────────────────────────┬──────────────────────────────────────┘
                                           │ (Crosses Tenant Boundary)
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TENANT B: GREEN SITE (Target Forge App)                                         │
│                                                                                 │
│ 6. [Forge Webtrigger] ──> [Forge Async Queue]                                   │
│                                   │                                             │
│                                   ▼                                             │
│ 7. Executes Workflow ◄── Query LOCAL Teamwork Graph (No cross-site REST API call!)│
└─────────────────────────────────────────────────────────────────────────────────┘

```

---

## 3. Signal vs. Context Specification

### 3.1 Signaling Layer: The "Lean CloudEvent" Standard

Lean events carry zero issue descriptions, zero comments, and zero human PII. They contain only Atlassian Resource Identifiers (ARIs), event types, and changed field keys.

```json
{
  "specversion": "1.0",
  "id": "evt_01J8A9X2Z4K5M6N7P8R9S0T1U2",
  "type": "avi:jira:updated:issue",
  "source": "ari:cloud:jira::site/blue-site-workspace-id",
  "subject": "issue/BLUE-101",
  "time": "2026-08-20T14:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "issueId": "10001",
    "issueKey": "BLUE-101",
    "projectKey": "BLUE",
    "updatedFields": ["status", "assignee"]
  }
}
```

### 3.2 Context Layer: The Teamwork Graph "Double"

Blue Site uses a Teamwork Graph Connector to sync a lightweight mirror entity (`ExternalWorkItem`) into Green Site's Teamwork Graph.

When Green Site receives the Lean Event stating `BLUE-101` updated, Green Site executes a **local** Teamwork Graph query:

```graphql
query GetSyncedWorkItem {
  externalWorkItem(id: "BLUE-101") {
    id
    title
    status
    url
  }
}
```

### 3.3 AsyncAPI 3.0 Contract Definition (`asyncapi.yaml`)

```yaml
asyncapi: 3.0.0
info:
  title: Enterprise Cross-Tenant Event Stream
  version: 2.0.0
  description: Lean CloudEvents delivered over AWS Serverless infrastructure to trigger cross-tenant Forge webtriggers.

servers:
  awsApiGateway:
    host: "https://events.mycompany.com/v1/ingest"
    protocol: https
    description: Region-pinned AWS API Gateway Ingest Endpoint

channels:
  leanProductEvents:
    address: "events.jira.lean"
    messages:
      issueUpdated:
        $ref: "#/components/messages/LeanJiraIssueUpdatedMessage"

operations:
  publishLeanEvent:
    action: send
    channel:
      $ref: "#/channels/leanProductEvents"
    summary: Blue Site dispatches a PII-free Lean Event signal to AWS.

components:
  messages:
    LeanJiraIssueUpdatedMessage:
      name: LeanJiraIssueUpdated
      contentType: application/json
      payload:
        type: object
        required: [specversion, id, type, source, subject, time, data]
        properties:
          specversion: { type: string, const: "1.0" }
          id: { type: string }
          type: { type: string, example: "avi:jira:updated:issue" }
          source: { type: string, example: "ari:cloud:jira::site/blue-site-id" }
          subject: { type: string, example: "issue/BLUE-101" }
          time: { type: string, format: date-time }
          data:
            type: object
            required: [issueKey, updatedFields]
            properties:
              issueKey: { type: string, example: "BLUE-101" }
              updatedFields:
                type: array
                items: { type: string }
```

---

## 4. AWS Infrastructure Specification

1. **Ingest (Amazon API Gateway):** Receives HTTP POST calls from Blue Site's Forge Remote. Uses direct AWS service integrations to push payloads to EventBridge without Lambda overhead.
2. **Event Router (Amazon EventBridge):** Evaluates declarative JSON rules matching `source` and `type`. Directs 100% of traffic to the Audit Log target, and routes matching tenant traffic to an SQS queue.
3. **Buffer & Rate-Limiter (Amazon SQS + API Destinations):** EventBridge API Destinations call Green Site's Forge Webtrigger. Attached SQS queues absorb bulk edit bursts (e.g., 3,000 events/min), while API Destinations meter delivery out at a configurable rate (e.g., 15 requests/sec or 900 req/min) to stay strictly within Forge's 1,000 req/min webtrigger limit.
4. **Audit Pipeline (Kinesis Data Firehose + S3):** Firehose automatically batches and compresses (GZIP) incoming CloudEvents, writing partitioned audit logs (`s3://audit-bucket/year=2026/month=08/`) to cold storage for compliance.

---

## 5. Enterprise Requirements & Compliance Alignment

Enterprise Atlassian customers enforce rigorous InfoSec constraints. This architecture satisfies key requirements out of the box:

### 1. Data Residency & Geofencing (EU/GDPR)

- **Requirement:** Customer data must not leave designated geographic boundaries (e.g., EU-only storage).
- **Implementation:** Deploy region-pinned AWS stacks (`us-east-1`, `eu-central-1`, `ap-southeast-2`). Map Forge Remote base URLs in `manifest.yml` so an EU-based Blue Site routes strictly to an AWS deployment in Frankfurt (`eu-central-1`).

### 2. Zero PII Egress & "Lean Event" Compliance

- **Requirement:** No raw employee data, intellectual property, or Jira issue body text may cross third-party infrastructure.
- **Implementation:** The AWS event bus strictly processes Lean CloudEvents containing structural IDs (`BLUE-101`). Sensitive context lives inside Atlassian's boundary via Teamwork Graph.

### 3. Tenant Isolation & Zero-Trust Authentication

- **Requirement:** Guarantee Blue Site cannot spoof events or read data from Green Site.
- **Implementation:**
- API Gateway enforces cryptographic **Forge Invocation Token (FIT)** validation on every incoming POST call.
- Green Site never exposes inbound API endpoints or OAuth client credentials to Blue Site.

### 4. Burst Management & Availability SLA

- **Requirement:** High-volume operations (e.g., bulk edits of 1,000+ issues or CI/CD releases) must not cause webtrigger dropouts (`429 Too Many Requests`).
- **Implementation:** SQS buffers absorb extreme event bursts instantly, and API Destinations automatically throttle delivery, smoothing out execution without dropping events.

---

## 6. Summary Comparison: Architecture Evolution

| Design Metric            | Original Fluvio Specification                  | Revised AWS + TWG Specification                             |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------- |
| **Compute Model**        | Custom Rust/WASM streaming cluster.            | **100% Serverless AWS** (API Gateway, EventBridge, SQS).    |
| **Data in Motion**       | Full CloudEvent payload containing issue data. | **Lean CloudEvent** (~500 bytes, IDs and deltas only).      |
| **Context Resolution**   | Cross-tenant REST API callbacks with OAuth.    | **Local Teamwork Graph query** (Zero cross-site callbacks). |
| **Rate-Limit Handling**  | Custom code / connector retries.               | **Native EventBridge API Destination throttling**.          |
| **Enterprise Readiness** | Requires managing custom infrastructure.       | **Multi-region, SOC2-friendly, zero-PII egress**.           |
