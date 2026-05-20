FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY --chown=node:node . .

USER node
CMD ["node", "index.js"]