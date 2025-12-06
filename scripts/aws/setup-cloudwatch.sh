#!/bin/bash
# =============================================================================
# H-FARM Assistant - CloudWatch Setup Script
# =============================================================================
# This script creates CloudWatch log groups and dashboards for monitoring
# the H-FARM Student Assistant application.
#
# Prerequisites:
#   - AWS CLI installed and configured (aws configure)
#   - Appropriate IAM permissions for CloudWatch
#
# Usage:
#   ./scripts/aws/setup-cloudwatch.sh
# =============================================================================

set -e

# Configuration
AWS_REGION="${AWS_REGION:-eu-west-1}"
LOG_GROUP_NAME="/hfarm/interactions"
DASHBOARD_NAME="HFarmAssistant"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== H-FARM CloudWatch Setup ===${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Create log group for interactions
echo -e "${YELLOW}Creating CloudWatch Log Group: $LOG_GROUP_NAME${NC}"
aws logs create-log-group \
    --log-group-name $LOG_GROUP_NAME \
    --region $AWS_REGION 2>/dev/null || echo "Log group may already exist"

# Set retention policy (30 days)
echo -e "${YELLOW}Setting retention policy to 30 days...${NC}"
aws logs put-retention-policy \
    --log-group-name $LOG_GROUP_NAME \
    --retention-in-days 30 \
    --region $AWS_REGION

echo -e "${GREEN}Log group created: $LOG_GROUP_NAME${NC}"
echo ""

# Create CloudWatch Dashboard
echo -e "${YELLOW}Creating CloudWatch Dashboard...${NC}"

DASHBOARD_BODY=$(cat << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "Chat Interactions Per Hour",
        "view": "timeSeries",
        "stacked": false,
        "region": "AWS_REGION_PLACEHOLDER",
        "metrics": [
          [ "AWS/Logs", "IncomingLogEvents", "LogGroupName", "/hfarm/interactions" ]
        ],
        "period": 3600
      }
    },
    {
      "type": "log",
      "x": 12,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "Recent Interactions",
        "query": "SOURCE '/hfarm/interactions' | fields @timestamp, userType, agentId, messageRole | sort @timestamp desc | limit 50",
        "region": "AWS_REGION_PLACEHOLDER",
        "view": "table"
      }
    },
    {
      "type": "log",
      "x": 0,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "Interactions by User Type",
        "query": "SOURCE '/hfarm/interactions' | stats count(*) by userType | sort count(*) desc",
        "region": "AWS_REGION_PLACEHOLDER",
        "view": "pie"
      }
    },
    {
      "type": "log",
      "x": 12,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "Interactions by Country",
        "query": "SOURCE '/hfarm/interactions' | stats count(*) by geoHints.country | sort count(*) desc | limit 10",
        "region": "AWS_REGION_PLACEHOLDER",
        "view": "bar"
      }
    }
  ]
}
EOF
)

# Replace placeholder with actual region
DASHBOARD_BODY=$(echo "$DASHBOARD_BODY" | sed "s/AWS_REGION_PLACEHOLDER/$AWS_REGION/g")

aws cloudwatch put-dashboard \
    --dashboard-name $DASHBOARD_NAME \
    --dashboard-body "$DASHBOARD_BODY" \
    --region $AWS_REGION

echo -e "${GREEN}Dashboard created: $DASHBOARD_NAME${NC}"
echo ""

# Create CloudWatch Alarm for high error rate
echo -e "${YELLOW}Creating CloudWatch Alarm for error monitoring...${NC}"
aws cloudwatch put-metric-alarm \
    --alarm-name "hfarm-high-interaction-rate" \
    --alarm-description "Alert when interaction rate is unusually high" \
    --namespace "AWS/Logs" \
    --metric-name "IncomingLogEvents" \
    --dimensions Name=LogGroupName,Value=$LOG_GROUP_NAME \
    --statistic Sum \
    --period 300 \
    --threshold 1000 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --region $AWS_REGION 2>/dev/null || echo "Alarm may already exist"

echo -e "${GREEN}Alarm created: hfarm-high-interaction-rate${NC}"
echo ""

echo -e "${GREEN}=== CloudWatch Setup Complete ===${NC}"
echo ""
echo "Log Group:  $LOG_GROUP_NAME"
echo "Dashboard:  https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${DASHBOARD_NAME}"
echo ""
echo -e "${YELLOW}Don't forget to add AWS_REGION to your environment variables:${NC}"
echo -e "${GREEN}AWS_REGION=\"$AWS_REGION\"${NC}"

