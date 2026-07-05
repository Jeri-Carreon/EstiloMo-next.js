FROM node:22-alpine

WORKDIR /usr/app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npm run prisma:generate

COPY . .

# Build args for Supabase and Prisma (needed at build time for Next.js / Prisma)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=https://estilomo.codeegoh.com
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN test -n "$NEXT_PUBLIC_SUPABASE_URL" || (echo "Missing build arg: NEXT_PUBLIC_SUPABASE_URL" && exit 1)
RUN test -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" || (echo "Missing build arg: NEXT_PUBLIC_SUPABASE_ANON_KEY" && exit 1)

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm start -- -H 0.0.0.0 -p ${PORT:-3000}"]
