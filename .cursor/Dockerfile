# Cloud agent environment (brief §4a: "environment as a first-class deliverable").
# Gives Cursor cloud agents the full toolchain to build, test, and verify end-to-end:
# Node 22 + pnpm (Next.js apps, packages, cursor-agents), Go 1.25 (apps/api),
# Python 3, ripgrep for SDK search, and a local PostgreSQL
# (application data for apps/api; started per-boot by .cursor/start.sh).

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git ripgrep jq unzip xz-utils sudo \
    python3 python3-pip python3-venv \
    postgresql postgresql-contrib postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22 + pnpm (pinned to the repo's packageManager version)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@9.15.9 --activate

# Go toolchain (apps/api requires go >= 1.25)
RUN curl -fsSL https://go.dev/dl/go1.25.0.linux-amd64.tar.gz | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:${PATH}"

WORKDIR /workspace
