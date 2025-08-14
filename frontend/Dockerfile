FROM node:20-bookworm-slim
WORKDIR /repo
ENV ROLLUP_NO_BINARY=true
RUN corepack enable

# keep pnpm’s store path inside the image to avoid “Unexpected store location”
RUN pnpm config set store-dir /pnpm-store

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json frontend/
RUN pnpm fetch --filter ./frontend

COPY frontend ./frontend
WORKDIR /repo/frontend
RUN pnpm install --frozen-lockfile

EXPOSE 5173
CMD ["pnpm","run","dev","--","--host","0.0.0.0"]
