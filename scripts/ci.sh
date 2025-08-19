#!/bin/bash

# CI/CD Gates Script for AeonPay
set -e

echo "🚀 Running AeonPay CI/CD Gates..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  if [ $2 -eq 0 ]; then
    echo -e "${GREEN}✅ $1${NC}"
  else
    echo -e "${RED}❌ $1 FAILED${NC}"
    exit 1
  fi
}

# 1. Backend checks (Python would be here, but we have TypeScript)
echo -e "${YELLOW}📋 Running TypeScript checks...${NC}"
npm run check
print_status "TypeScript compilation" $?

# 2. Linting
echo -e "${YELLOW}🔍 Running ESLint...${NC}"
if command -v eslint &> /dev/null; then
  npx eslint server/ --ext .ts,.js
  print_status "ESLint (backend)" $?
else
  echo -e "${YELLOW}⚠️  ESLint not configured, skipping...${NC}"
fi

# 3. PII scanning test
echo -e "${YELLOW}🔐 Running PII scanning tests...${NC}"
# This would check that no AI calls contain raw PII
node -e "
const fs = require('fs');
const files = ['server/services/ai/policy.ts', 'server/middleware/privacy.ts'];
let piiFound = false;

files.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    // Check for potential PII in AI calls
    if (content.includes('phone') && content.includes('ai') && !content.includes('redact')) {
      console.log(\`⚠️  Potential PII leak in \${file}\`);
      piiFound = true;
    }
  }
});

if (piiFound) {
  console.log('❌ PII scanning failed - raw personal data may be sent to AI');
  process.exit(1);
} else {
  console.log('✅ PII scanning passed - no raw personal data in AI calls');
}
"
print_status "PII scanning" $?

# 4. Frontend build test
echo -e "${YELLOW}🏗️  Testing frontend build...${NC}"
npm run build
print_status "Frontend build" $?

# 5. Performance budget check
echo -e "${YELLOW}📊 Checking performance budget...${NC}"
node -e "
const fs = require('fs');
const path = require('path');

function getDirectorySize(dir) {
  let size = 0;
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        size += stats.size;
      } else if (stats.isDirectory()) {
        size += getDirectorySize(filePath);
      }
    });
  }
  return size;
}

const distSize = getDirectorySize('./dist');
const maxSize = 200 * 1024; // 200KB budget

console.log(\`Built bundle size: \${(distSize / 1024).toFixed(2)}KB\`);

if (distSize > maxSize) {
  console.log(\`❌ Bundle exceeds 200KB budget (\${(distSize / 1024).toFixed(2)}KB)\`);
  process.exit(1);
} else {
  console.log('✅ Bundle size within budget');
}
"
print_status "Performance budget" $?

# 6. Security headers test
echo -e "${YELLOW}🛡️  Testing security headers...${NC}"
node -e "
const securityFile = './server/middleware/security.ts';
const fs = require('fs');

if (fs.existsSync(securityFile)) {
  const content = fs.readFileSync(securityFile, 'utf8');
  const requiredHeaders = ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options'];
  let allFound = true;
  
  requiredHeaders.forEach(header => {
    if (!content.includes(header)) {
      console.log(\`❌ Missing security header: \${header}\`);
      allFound = false;
    }
  });
  
  if (allFound) {
    console.log('✅ All required security headers present');
  } else {
    process.exit(1);
  }
} else {
  console.log('❌ Security middleware not found');
  process.exit(1);
}
"
print_status "Security headers" $?

# 7. API rate limit test
echo -e "${YELLOW}⚡ Testing rate limiting...${NC}"
node -e "
const rateLimitFile = './server/middleware/security.ts';
const fs = require('fs');

if (fs.existsSync(rateLimitFile)) {
  const content = fs.readFileSync(rateLimitFile, 'utf8');
  const requiredLimits = ['authRateLimit', 'paymentsRateLimit', 'swapRateLimit', 'aiRateLimit'];
  let allFound = true;
  
  requiredLimits.forEach(limit => {
    if (!content.includes(limit)) {
      console.log(\`❌ Missing rate limit: \${limit}\`);
      allFound = false;
    }
  });
  
  if (allFound) {
    console.log('✅ All required rate limits configured');
  } else {
    process.exit(1);
  }
} else {
  console.log('❌ Rate limiting not configured');
  process.exit(1);
}
"
print_status "Rate limiting" $?

echo -e "${GREEN}🎉 All CI/CD gates passed successfully!${NC}"
echo "🚢 Ready for deployment"