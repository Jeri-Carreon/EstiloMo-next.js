FROM node:24.16.0-alpine

WORKDIR /usr/app

COPY . .

RUN npm ci --only=production

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm start -- -H 0.0.0.0 -p ${PORT:-3000}"]
