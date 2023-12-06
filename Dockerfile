# Base node image
FROM node:19-alpine AS node

# Install mitmproxy cert
RUN apk --no-cache add ca-certificates
COPY  ./proxy/mitmproxy/cert/mitmproxy-ca-cert.cer /usr/local/share/ca-certificates/mitmproxy-ca-cert.crt
RUN update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/mitmproxy-ca-cert.crt 
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

COPY . /app
WORKDIR /app

# Install call deps - Install curl for health check
RUN apk --no-cache add curl && \
    # We want to inherit env from the container, not the file
    # This will preserve any existing env file if it's already in source
    # otherwise it will create a new one
    touch .env && \
    # Build deps in seperate 
    npm ci

# React client build
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run frontend

# Node API setup
EXPOSE 3080
ENV HOST=0.0.0.0
CMD ["npm", "run", "backend"]

# Optional: for client with nginx routing
# FROM nginx:stable-alpine AS nginx-client
# WORKDIR /usr/share/nginx/html
# COPY --from=node /app/client/dist /usr/share/nginx/html
# COPY client/nginx.conf /etc/nginx/conf.d/default.conf
# ENTRYPOINT ["nginx", "-g", "daemon off;"]
