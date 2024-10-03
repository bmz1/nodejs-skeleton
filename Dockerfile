FROM node:20-alpine as builder
ARG npm_token

ENV NPM_TOKEN=$npm_token

WORKDIR /usr/src/app
COPY ./package.json .
COPY ./package-lock.json .
COPY ./.npmrc .
RUN npm ci

COPY . .