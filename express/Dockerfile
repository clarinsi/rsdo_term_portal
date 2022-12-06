# syntax=docker/dockerfile:1

# Use the non-alpine base image for easier container debugging.
# FROM node:14
FROM node:16-alpine

# Curl is used in cron batch file.
RUN apk --no-cache add curl

WORKDIR /usr/src/app

COPY package*.json .
RUN npm install

COPY . .

COPY scheduled/crontab /var/spool/cron/crontabs/root
RUN which crond && \
  rm -rf /etc/periodic && \
  chmod 0744 scheduled/entrypoint.sh

EXPOSE 3000

# Use devstart-wait if you need code execution to pause until a debugger is attached.
# CMD ["npm", "run", "devstart-wait"]
CMD ["npm", "run", "devstart"]
