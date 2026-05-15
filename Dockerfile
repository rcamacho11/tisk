ARG WORKDIR=/app
FROM node:20-slim
RUN apt-get update && apt-get install -y curl --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
ARG WORKDIR
WORKDIR ${WORKDIR}
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 8081 19000 19001 19002
