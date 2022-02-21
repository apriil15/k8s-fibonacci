# step1: build
FROM node:16-alpine AS builder

WORKDIR '/app'

COPY ./package.json .

RUN npm install

COPY . .

RUN npm run build

# step2: serve at nginx
FROM nginx

EXPOSE 3000

# overwrite nginx config
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# production assets
COPY --from=builder /app/build /usr/share/nginx/html
