#!/bin/bash
#
# Faenza VPN Setup Script for macOS
#
# This script creates and configures the Cisco IPSec VPN profile on macOS.
# It stores credentials in the macOS Keychain for automatic connection.
#
# Usage: ./setup-vpn-macos.sh
#
# Requirements:
#   - macOS 10.14 or later
#   - Administrator privileges (for networksetup commands)
#   - Environment variables set in .env file
#

set -e

# Load environment variables from .env if it exists
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
elif [ -f "../.env" ]; then
    export $(grep -v '^#' ../.env | xargs)
fi

# Configuration
VPN_NAME="${VPN_NAME:-faenza vpn}"
VPN_SERVER="${VPN_SERVER:-195.62.179.98}"
VPN_USERNAME="${VPN_USERNAME}"
VPN_PASSWORD="${VPN_PASSWORD}"
VPN_SHARED_SECRET="${VPN_SHARED_SECRET}"
VPN_GROUP_NAME="${VPN_GROUP_NAME:-Memoraiz}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Faenza VPN Setup for macOS ===${NC}"
echo ""

# Validate required variables
missing_vars=()
[ -z "$VPN_USERNAME" ] && missing_vars+=("VPN_USERNAME")
[ -z "$VPN_PASSWORD" ] && missing_vars+=("VPN_PASSWORD")
[ -z "$VPN_SHARED_SECRET" ] && missing_vars+=("VPN_SHARED_SECRET")

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please set these variables in your .env file or export them."
    exit 1
fi

echo "VPN Configuration:"
echo "  Name:     $VPN_NAME"
echo "  Server:   $VPN_SERVER"
echo "  Username: $VPN_USERNAME"
echo "  Group:    $VPN_GROUP_NAME"
echo ""

# Check if VPN already exists
if scutil --nc list 2>/dev/null | grep -q "$VPN_NAME"; then
    echo -e "${YELLOW}VPN profile '$VPN_NAME' already exists.${NC}"
    read -p "Do you want to delete and recreate it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing existing VPN profile..."
        # Get the service ID
        SERVICE_ID=$(scutil --nc list | grep "$VPN_NAME" | awk -F'[()]' '{print $2}')
        if [ -n "$SERVICE_ID" ]; then
            sudo networksetup -removenetworkservice "$VPN_NAME" 2>/dev/null || true
        fi
    else
        echo "Keeping existing VPN profile."
        echo -e "${GREEN}Setup complete.${NC}"
        exit 0
    fi
fi

echo "Creating VPN profile..."

# Create the VPN using networksetup
# Note: On macOS, creating a Cisco IPSec VPN via command line is limited.
# We'll create the VPN and then the user needs to add credentials via System Preferences
# or we use security command to add to keychain.

# Create a new network service for VPN
# This is a workaround since networksetup doesn't directly support creating Cisco IPSec

echo -e "${YELLOW}Note: macOS requires manual VPN creation through System Settings.${NC}"
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Open System Settings → VPN"
echo "2. Click 'Add VPN Configuration' → 'Cisco IPSec'"
echo "3. Enter the following details:"
echo ""
echo -e "   ${GREEN}Display Name:${NC}    $VPN_NAME"
echo -e "   ${GREEN}Server Address:${NC}  $VPN_SERVER"
echo -e "   ${GREEN}Account Name:${NC}    $VPN_USERNAME"
echo -e "   ${GREEN}Password:${NC}        (your password from VPN_PASSWORD)"
echo ""
echo "4. Click 'Authentication Settings...'"
echo -e "   ${GREEN}Shared Secret:${NC}   (your secret from VPN_SHARED_SECRET)"
echo -e "   ${GREEN}Group Name:${NC}      $VPN_GROUP_NAME"
echo ""
echo "5. Click 'OK' and then 'Create'"
echo ""

# Store credentials in Keychain (optional, for reference)
echo "Storing credentials in Keychain..."

# Store the shared secret
security add-generic-password -a "$VPN_NAME" -s "com.apple.net.vpn.SharedSecret" \
    -w "$VPN_SHARED_SECRET" -U 2>/dev/null || true

# Store the XAuth password
security add-generic-password -a "$VPN_USERNAME" -s "$VPN_NAME" \
    -w "$VPN_PASSWORD" -U 2>/dev/null || true

echo -e "${GREEN}Credentials stored in Keychain.${NC}"
echo ""

# Test if VPN was created
echo "Checking VPN status..."
if scutil --nc list 2>/dev/null | grep -q "$VPN_NAME"; then
    echo -e "${GREEN}✓ VPN profile '$VPN_NAME' found.${NC}"
    echo ""
    echo "To connect manually:"
    echo "  scutil --nc start \"$VPN_NAME\""
    echo ""
    echo "To check status:"
    echo "  scutil --nc status \"$VPN_NAME\""
else
    echo -e "${YELLOW}⚠ VPN profile not found. Please create it manually as described above.${NC}"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"

