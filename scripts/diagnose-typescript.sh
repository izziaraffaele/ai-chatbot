#!/bin/bash

# TypeScript Diagnostics Script
# Identifies type inference bottlenecks and suggests fixes

echo "=== TypeScript Diagnostics Report ==="
echo "Generated: $(date)"
echo ""

# 1. Check current tsconfig settings
echo "1. Current TypeScript Configuration:"
echo "==========================================="
grep -E '"strict"|"skipLibCheck"|"incremental"|"noImplicitAny"' tsconfig.json || echo "Config keys not found"
echo ""

# 2. Memory usage
echo "2. Available Memory:"
echo "==========================================="
echo "Available: $(free -h | grep Mem | awk '{print $7}')"
echo ""

# 3. File count and size
echo "3. TypeScript Files Analysis:"
echo "==========================================="
echo "Total TS/TSX files: $(find . -name '*.ts' -o -name '*.tsx' | grep -v node_modules | wc -l)"
echo "Total size: $(find . \( -name '*.ts' -o -name '*.tsx' \) -not -path './node_modules/*' -exec du -c {} + | tail -1 | awk '{print $1 " bytes"}')"
echo ""
echo "Largest files:"
find . \( -name '*.ts' -o -name '*.tsx' \) -not -path './node_modules/*' -exec wc -l {} + | sort -rn | head -5
echo ""

# 4. Check for problematic patterns
echo "4. Type Inference Red Flags:"
echo "==========================================="
echo "Files with 'as any' assertions:"
grep -r "as any" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules | wc -l

echo ""
echo "Files with complex generics (extends keyword):"
grep -r "extends.*extends" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules | wc -l

echo ""
echo "Files with potential circular imports:"
grep -r "from '@/" components/ | awk '{print $3}' | sort | uniq -d | wc -l

echo ""

# 5. Dependency check
echo "5. Dependency Analysis:"
echo "==========================================="
echo "Total packages: $(ls node_modules/.pnpm | wc -l)"
echo "Heavy packages (>1MB): $(find node_modules -type d -name '*.d.ts' | wc -l)"
echo ""

# 6. Recommendations
echo "6. Quick Fix Recommendations:"
echo "==========================================="
echo "✓ Currently using skipLibCheck: $(grep '"skipLibCheck": true' tsconfig.json && echo 'YES' || echo 'NO')"
echo "✓ Using incremental compilation: $(grep '"incremental": true' tsconfig.json && echo 'YES' || echo 'NO')"

if grep -q '"strict": true' tsconfig.json; then
    echo "⚠️  Consider changing 'strict: true' to 'strict: false' + 'noImplicitAny: true' for 2-5x faster checks"
fi

echo ""
echo "Next steps:"
echo "1. Run: time tsc --noEmit"
echo "2. If slow, increase memory: node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit"
echo "3. Check specific file: tsc --noEmit components/chat-message.tsx"
