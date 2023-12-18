FROM node:18-alpine

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json yarn.lock ./
RUN yarn

COPY . .
RUN yarn build

EXPOSE 8008
CMD [ "yarn", "start:build"]
