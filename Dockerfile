FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client ./client
COPY calendar-connectors.js ./
RUN npm ci && npm run build

FROM node:24-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY --from=build /app/dist ./dist
RUN mkdir -p /data && chown -R node:node /app /data
USER node
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0 MODO_DATA_DIR=/data
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
