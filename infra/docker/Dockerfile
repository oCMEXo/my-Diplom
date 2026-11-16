FROM node:22-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS app
ARG APP=api
ENV APP=${APP}
COPY . .
RUN pnpm install --frozen-lockfile --filter "@collab/${APP}..." \
    && if [ "$APP" != runner ]; then pnpm --filter @collab/db generate; fi
ENV NODE_ENV=production
CMD ["sh", "-c", "exec pnpm --filter @collab/$APP exec tsx src/server.ts"]

FROM app AS runner
COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker
