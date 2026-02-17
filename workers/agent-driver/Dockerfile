FROM node:22-slim

# Install Playwright's Chromium dependencies
RUN npx playwright install --with-deps chromium

WORKDIR /app

# Copy agent-driver
COPY workers/agent-driver/package*.json ./
RUN npm ci --production

COPY workers/agent-driver/ ./

# Default to live GitHub Pages URL
ENV ZION_URL=https://kody-w.github.io/zion/

# Expose no ports — the host connects outbound via PeerJS
CMD ["node", "host.js"]
