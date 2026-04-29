FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate resolve --applied 20240101000000_init 2>/dev/null || true && npx prisma migrate deploy && node dist/main"]
