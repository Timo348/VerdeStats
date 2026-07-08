# VerdeStats - Spotify Extended Streaming History Analyzer
FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
