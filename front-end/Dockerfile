FROM node:22-alpine

WORKDIR /usr/app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npm run prisma:generate

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm start -- -H 0.0.0.0 -p ${PORT:-3000}"]
