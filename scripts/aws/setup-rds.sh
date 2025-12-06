#!/bin/bash
# =============================================================================
# H-FARM Assistant - RDS PostgreSQL Setup Script
# =============================================================================
# This script creates an RDS PostgreSQL instance with pgvector extension enabled
# for the H-FARM Student Assistant application.
#
# Prerequisites:
#   - AWS CLI installed and configured (aws configure)
#   - Appropriate IAM permissions for RDS and EC2
#
# Usage:
#   ./scripts/aws/setup-rds.sh
# =============================================================================

set -e

# Configuration - Customize these values
DB_INSTANCE_ID="${DB_INSTANCE_ID:-hfarm-postgres}"
DB_NAME="${DB_NAME:-hfarm_db}"
DB_USERNAME="${DB_USERNAME:-hfarm_admin}"
DB_INSTANCE_CLASS="${DB_INSTANCE_CLASS:-db.t3.micro}"
DB_STORAGE="${DB_STORAGE:-20}"
AWS_REGION="${AWS_REGION:-eu-west-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== H-FARM RDS PostgreSQL Setup ===${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if AWS is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

# Generate secure password
echo -e "${YELLOW}Generating secure database password...${NC}"
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
echo -e "${GREEN}Password generated (save this securely!): ${DB_PASSWORD}${NC}"
echo ""

# Get default VPC
echo -e "${YELLOW}Finding default VPC...${NC}"
VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=is-default,Values=true" \
    --query "Vpcs[0].VpcId" \
    --output text \
    --region $AWS_REGION)

if [ "$VPC_ID" == "None" ] || [ -z "$VPC_ID" ]; then
    echo -e "${RED}Error: No default VPC found. Please create one or specify a VPC ID.${NC}"
    exit 1
fi
echo -e "${GREEN}Found VPC: $VPC_ID${NC}"

# Create security group
echo -e "${YELLOW}Creating security group for RDS...${NC}"
SG_ID=$(aws ec2 create-security-group \
    --group-name "hfarm-db-sg" \
    --description "Security group for H-FARM RDS PostgreSQL" \
    --vpc-id $VPC_ID \
    --query "GroupId" \
    --output text \
    --region $AWS_REGION 2>/dev/null || \
    aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=hfarm-db-sg" \
        --query "SecurityGroups[0].GroupId" \
        --output text \
        --region $AWS_REGION)

echo -e "${GREEN}Security Group ID: $SG_ID${NC}"

# Add inbound rule for PostgreSQL (allow from anywhere for simplicity - restrict in production)
echo -e "${YELLOW}Adding inbound rule for PostgreSQL...${NC}"
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION 2>/dev/null || echo "Inbound rule may already exist"

# Create RDS instance
echo -e "${YELLOW}Creating RDS PostgreSQL instance (this may take 5-10 minutes)...${NC}"
aws rds create-db-instance \
    --db-instance-identifier $DB_INSTANCE_ID \
    --db-instance-class $DB_INSTANCE_CLASS \
    --engine postgres \
    --engine-version 16.3 \
    --master-username $DB_USERNAME \
    --master-user-password $DB_PASSWORD \
    --allocated-storage $DB_STORAGE \
    --storage-type gp3 \
    --vpc-security-group-ids $SG_ID \
    --publicly-accessible \
    --db-name $DB_NAME \
    --backup-retention-period 7 \
    --region $AWS_REGION

echo -e "${YELLOW}Waiting for RDS instance to be available...${NC}"
aws rds wait db-instance-available \
    --db-instance-identifier $DB_INSTANCE_ID \
    --region $AWS_REGION

# Get endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --query "DBInstances[0].Endpoint.Address" \
    --output text \
    --region $AWS_REGION)

echo ""
echo -e "${GREEN}=== RDS Instance Created Successfully ===${NC}"
echo ""
echo -e "Instance ID: ${GREEN}$DB_INSTANCE_ID${NC}"
echo -e "Endpoint:    ${GREEN}$DB_ENDPOINT${NC}"
echo -e "Database:    ${GREEN}$DB_NAME${NC}"
echo -e "Username:    ${GREEN}$DB_USERNAME${NC}"
echo -e "Password:    ${GREEN}$DB_PASSWORD${NC}"
echo ""
echo -e "${YELLOW}Connection String (save this to .env.local):${NC}"
echo -e "${GREEN}POSTGRES_URL=\"postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:5432/${DB_NAME}\"${NC}"
echo ""
echo -e "${YELLOW}=== IMPORTANT: Enable pgvector Extension ===${NC}"
echo "Connect to the database and run:"
echo -e "${GREEN}CREATE EXTENSION IF NOT EXISTS vector;${NC}"
echo ""
echo "You can connect using:"
echo -e "${GREEN}psql \"postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:5432/${DB_NAME}\"${NC}"

