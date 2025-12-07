# AWS Production Deployment Guide for H-FARM Student Assistant

This guide provides step-by-step instructions to deploy the H-FARM Student Assistant chatbot to AWS with:

- **No login required** (guest sessions auto-created)
- **Limited requests per session** (50 messages/day for guests, 200 for registered users)
- **Interaction tracking** (CloudWatch logging for analytics)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐                    │
│  │  AWS Amplify    │    │  Amazon RDS      │                    │
│  │  Hosting        │───▶│  PostgreSQL      │                    │
│  │  (Next.js SSR)  │    │  + pgvector      │                    │
│  └─────────────────┘    └──────────────────┘                    │
│          │                       │                               │
│          ▼                       ▼                               │
│  ┌─────────────────┐    ┌──────────────────┐                    │
│  │  CloudWatch     │    │  Secrets Manager │                    │
│  │  (Logs/Metrics) │    │  (API Keys)      │                    │
│  └─────────────────┘    └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- AWS Account with admin access
- AWS CLI installed and configured (`aws configure`)
- GitHub repository with the project code
- Node.js 20+ and pnpm installed locally


### Automated Setup Scripts

We provide helper scripts in `scripts/aws/`:

```bash
# 1. Set up RDS PostgreSQL
./scripts/aws/setup-rds.sh

# 2. Set up CloudWatch monitoring
./scripts/aws/setup-cloudwatch.sh
```

---

## Phase 1: Database Setup (Amazon RDS PostgreSQL)

### Option A: Using the Automated Script

```bash
# Configure options (optional - defaults work fine)
export AWS_REGION="eu-west-1"
export DB_INSTANCE_CLASS="db.t3.micro"

# Run the setup script
./scripts/aws/setup-rds.sh
```

The script will:
1. Create a security group
2. Create an RDS PostgreSQL 16.3 instance
3. Output the connection string

### Option B: Manual Setup via AWS Console

1. Open [Amazon RDS Console](https://console.aws.amazon.com/rds/)
2. Click **Create database**
3. Configure:
   - **Engine**: PostgreSQL 16.3
   - **Template**: Free tier or Production
   - **Instance**: `db.t3.micro` (or larger for production)
   - **Storage**: 20 GB gp3
   - **Connectivity**: Publicly accessible (for initial setup)
   - **Database name**: `hfarm_db`
   - **Username**: `hfarm_admin`
4. Create and wait for the instance to be available

### Enable pgvector Extension

Connect to your RDS instance and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Phase 2: Deploy to AWS Amplify

### Step 1: Connect Repository

1. Open [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **Create new app**
3. Select **GitHub** and authorize access
4. Select your repository and branch (e.g., `main`, `production`, or `staging`)
   > ⚠️ **Important**: Branch names **cannot contain forward slashes** (`/`). Use hyphens instead (e.g., `feature-auth` not `feature/auth`). Amplify uses branch names for backend environment names, and slashes are invalid characters.
5. Amplify will auto-detect Next.js 15

### Step 2: Configure Build Settings

The `amplify.yml` file in the project root configures the build:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - corepack enable
        - corepack prepare pnpm@9.12.3 --activate
        - pnpm install --frozen-lockfile
        - pnpm db:migrate
    build:
      commands:
        - pnpm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### Step 3: Configure Environment Variables

In Amplify Console > **App settings** > **Environment variables**, add:

| Variable | Value | Description |
|----------|-------|-------------|
| `POSTGRES_URL` | `postgresql://...?sslmode=require` | RDS PostgreSQL connection string (SSL required!) |
| `OPENAI_API_KEY` | `sk-...` | Your OpenAI API key |
| `AUTH_SECRET` | (generate) | NextAuth.js secret (32+ chars) |
| `AUTH_URL` | `https://your-app.amplifyapp.com` | Your Amplify app URL |
| `AWS_REGION` | `eu-west-1` | AWS region for CloudWatch |
| `NODE_ENV` | `production` | Environment mode |

Generate `AUTH_SECRET`:
```bash
openssl rand -hex 32
```

### Step 4: Deploy

Push to your connected branch to trigger deployment:

```bash
git push origin main
```

Monitor deployment in the Amplify Console.

---

## Phase 3: Database Migration and Vector Ingestion

### Run Migrations

Before first deployment (or run in Amplify preBuild):

```bash
# Set environment variable
export POSTGRES_URL="postgresql://..."

# Run migrations
pnpm db:migrate
```

### Ingest Vector Data

After the database is set up, populate the vector catalog:

```bash
POSTGRES_URL="postgresql://..." pnpm catalog:ingest:hfarm
```

---

## Phase 4: Set Up Monitoring

### Using the Automated Script

```bash
export AWS_REGION="eu-west-1"
./scripts/aws/setup-cloudwatch.sh
```

This creates:
- Log group: `/hfarm/interactions`
- Dashboard: `HFarmAssistant`
- High-rate alarm

### Manual Setup

1. Create CloudWatch Log Group:
   ```bash
   aws logs create-log-group --log-group-name /hfarm/interactions
   aws logs put-retention-policy --log-group-name /hfarm/interactions --retention-in-days 30
   ```

2. View the dashboard at:
   `https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=HFarmAssistant`

---

## Phase 5: Configure Custom Domain (Optional)

1. Go to **App settings** > **Domain management** in Amplify
2. Click **Add domain**
3. Enter your domain (e.g., `assistant.hfarm.com`)
4. Follow DNS configuration instructions

---

## Rate Limiting Configuration

The application enforces rate limits per session. Configuration is in `lib/ai/entitlements.ts`:

```typescript
export const entitlementsByUserType: Record<UserType, Entitlements> = {
  guest: {
    maxMessagesPerDay: 50,  // Guest sessions
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },
  regular: {
    maxMessagesPerDay: 200, // Registered users
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },
};
```

---

## Interaction Logging

User interactions are automatically logged to CloudWatch. The logging captures:

- User ID and type (guest/regular)
- Chat ID and message role
- Agent ID used
- Timestamp
- Geographic location (city, country)

Logs are stored in `/hfarm/interactions` log group.

---

## Post-Deployment Checklist

- [ ] Verify app loads at Amplify URL
- [ ] Test guest session creation (no login required)
- [ ] Verify rate limiting works after 50+ messages
- [ ] Check CloudWatch logs for interactions
- [ ] Test video library and quiz features
- [ ] Verify semantic search (hfarmCatalog tool)
- [ ] Configure SSL certificate (auto-provisioned by Amplify)
- [ ] Set up billing alerts in AWS

---

## Cost Estimation

| Service | Monthly Cost (Est.) |
|---------|---------------------|
| AWS Amplify Hosting | $5-20 (based on traffic) |
| RDS PostgreSQL (db.t3.micro) | $15-25 |
| CloudWatch Logs | $0.50/GB ingested |
| **Total** | **~$25-50/month** |

---

## Troubleshooting

### Build Fails with "BackendEnvironment name is invalid"
Branch names containing `/` (forward slashes) are not allowed in Amplify. Rename your branch:
```bash
git branch -m feature/myfeature feature-myfeature
git push origin feature-myfeature
git push origin --delete feature/myfeature
```
Then reconnect the renamed branch in Amplify Console.

### Build Fails with pnpm Error
Ensure `amplify.yml` includes corepack commands to enable pnpm.

### Database Connection Error: "no pg_hba.conf entry... no encryption"
AWS RDS requires SSL connections. Add `?sslmode=require` to your `POSTGRES_URL`:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

### Database Connection Timeout
Check RDS security group allows inbound from Amplify (0.0.0.0/0 if publicly accessible).

### Rate Limiting Not Working
Verify `entitlementsByUserType` in `lib/ai/entitlements.ts` has finite values.

### CloudWatch Logs Not Appearing
1. Ensure `AWS_REGION` environment variable is set
2. Check IAM role has CloudWatch permissions
3. Verify log group exists: `/hfarm/interactions`

### pgvector Extension Missing
Connect to RDS and run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Security Best Practices

1. **Restrict RDS Access**: After setup, update security group to only allow Amplify IPs
2. **Rotate Secrets**: Periodically rotate `AUTH_SECRET` and database password
3. **Enable RDS Encryption**: Use encrypted storage in production
4. **Use Secrets Manager**: Store sensitive values in AWS Secrets Manager
5. **Enable MFA**: Require MFA for AWS console access

---

## Support

For issues specific to:
- **Mastra Framework**: [Mastra Documentation](https://mastra.ai/docs)
- **AWS Amplify**: [Amplify Documentation](https://docs.aws.amazon.com/amplify/)
- **Next.js**: [Next.js Documentation](https://nextjs.org/docs)

