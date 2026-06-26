FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY tools/mtapi-worker/index.mjs ./index.mjs

CMD ["node", "index.mjs"]
