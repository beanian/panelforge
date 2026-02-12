FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY client/package.json client/
COPY server/package.json server/

RUN npm ci --ignore-scripts

COPY . .

RUN cd server && npx prisma generate
RUN npm run build --workspace=client

ENV NODE_ENV=production PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "cd server && npx prisma migrate deploy && npx tsx src/index.ts"]
