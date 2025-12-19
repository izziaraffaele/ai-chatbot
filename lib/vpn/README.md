# Faenza VPN Configuration

This module provides automatic VPN connection management for accessing the SIBAC Oracle database. It supports both local development (macOS) and production deployment (Linux/AWS).

## Environment Variables

Add these to your `.env` file:

```bash
# VPN Configuration
VPN_NAME="faenza vpn"              # VPN service name (macOS)
VPN_SERVER="195.62.179.98"         # VPN server address
VPN_USERNAME="your_username"       # VPN username
VPN_PASSWORD="your_password"       # VPN password
VPN_SHARED_SECRET="your_secret"    # IPSec shared secret
VPN_GROUP_NAME="Memoraiz"          # IPSec group name
VPN_AUTO_CONNECT="true"            # Auto-connect when needed
```

## Setup

### macOS (Local Development)

1. Run the setup script:
   ```bash
   ./scripts/setup-vpn-macos.sh
   ```

2. Follow the on-screen instructions to create the VPN profile in System Settings.

3. The script stores credentials in macOS Keychain for automatic connection.

### Linux (AWS/Production)

1. Run the setup script:
   ```bash
   sudo ./scripts/setup-vpn-linux.sh
   ```

2. The script:
   - Installs `vpnc` if not present
   - Creates `/etc/vpnc/faenza.conf` with credentials
   - Sets up convenience scripts
   - Configures passwordless sudo for VPN commands

3. Available commands after setup:
   - `faenza-vpn-connect` - Connect to VPN
   - `faenza-vpn-disconnect` - Disconnect from VPN
   - `faenza-vpn-status` - Check VPN status

## Usage in Code

```typescript
import { 
  connectVpn, 
  disconnectVpn, 
  isVpnConnected, 
  withVpnConnection 
} from '@/lib/vpn/faenza-vpn';

// Check connection status
const connected = await isVpnConnected();

// Connect manually
const result = await connectVpn();
if (result.success) {
  console.log('Connected!');
}

// Auto-connect wrapper (recommended)
const data = await withVpnConnection(async () => {
  // Your code that needs VPN access
  return await fetchFromOracle();
});

// Disconnect
await disconnectVpn();
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application                          │
│                         │                               │
│              withVpnConnection()                        │
│                         │                               │
│     ┌───────────────────┼───────────────────┐          │
│     │                   │                   │          │
│   macOS              Platform             Linux        │
│   (darwin)           Detect              (linux)       │
│     │                                       │          │
│  scutil                                   vpnc         │
│  (native VPN)                      (Cisco IPSec)      │
│     │                                       │          │
└─────┼───────────────────────────────────────┼──────────┘
      │                                       │
      └───────────────► VPN Server ◄──────────┘
                    195.62.179.98
                          │
                   Oracle Database
                    192.168.0.204
```

## Troubleshooting

### macOS

- **VPN profile not found**: Create it manually in System Settings → VPN
- **Connection fails**: Check credentials in Keychain Access app
- **Timeout**: Increase `VPN_CONNECT_TIMEOUT` in code

### Linux

- **vpnc not found**: Run `sudo apt-get install vpnc`
- **Permission denied**: Check sudoers configuration
- **Connection fails**: Check `/var/log/syslog` for vpnc errors

### General

- **Oracle not reachable after VPN connect**: Wait a few seconds for routing
- **Credentials missing**: Ensure all `VPN_*` env variables are set

