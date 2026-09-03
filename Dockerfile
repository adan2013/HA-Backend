FROM node:22-alpine AS builder

WORKDIR /opt/app
COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile
COPY src ./src
RUN yarn build

FROM node:22-alpine AS production-dependencies

WORKDIR /opt/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

FROM node:22-alpine

ENV NODE_ENV=production
ENV ENV=production
WORKDIR /opt/app

COPY package.json ./
COPY --from=production-dependencies /opt/app/node_modules ./node_modules
COPY --from=builder /opt/app/build ./build

USER node
EXPOSE 8008
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const s=require('net').connect(8008,'127.0.0.1',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),2000)"
CMD ["node", "build/index.js"]
