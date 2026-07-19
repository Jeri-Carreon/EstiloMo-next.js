FROM node:22-alpine

WORKDIR /usr/app

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN test -n "$NEXT_PUBLIC_SUPABASE_URL" || \
    (echo "Missing build arg: NEXT_PUBLIC_SUPABASE_URL" && exit 1)

RUN test -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" || \
    (echo "Missing build arg: NEXT_PUBLIC_SUPABASE_ANON_KEY" && exit 1)

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "test -n \"$REPORTS_API_KEY\" || (echo 'Missing runtime env: REPORTS_API_KEY' && exit 1); test -n \"$AI_REPORT_SERVICE_URL\" || (echo 'Missing runtime env: AI_REPORT_SERVICE_URL' && exit 1); test -n \"$OPENAI_API_KEY\" || (echo 'Missing runtime env: OPENAI_API_KEY' && exit 1); npm start -- -H 0.0.0.0"]
