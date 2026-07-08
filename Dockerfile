FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

COPY package.json server.mjs ./
COPY public ./public

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
