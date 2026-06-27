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
ARG SUPABASE_SERVICE_ROLE_KEY
ARG DATABASE_URL=postgresql://postgres.fmllpnbljzsybdjmpmzf:uVHpLHosV6zeW9Et@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
ARG DIRECT_URL=postgresql://postgres.fmllpnbljzsybdjmpmzf:uVHpLHosV6zeW9Et@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_URL=$DIRECT_URL

RUN test -n "$NEXT_PUBLIC_SUPABASE_URL" || (echo "Missing build arg: NEXT_PUBLIC_SUPABASE_URL" && exit 1)
RUN test -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" || (echo "Missing build arg: NEXT_PUBLIC_SUPABASE_ANON_KEY" && exit 1)

RUN echo "URL=$NEXT_PUBLIC_SUPABASE_URL"
RUN echo "ANON=${NEXT_PUBLIC_SUPABASE_ANON_KEY:+SET}"
RUN echo "SERVICE=${SUPABASE_SERVICE_ROLE_KEY:+SET}"

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm start -- -H 0.0.0.0 -p ${PORT:-3000}"]
