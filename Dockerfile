FROM node:20-alpine AS build
WORKDIR /app
# cypress is a dependency, but the build does not need its binary.
ENV CYPRESS_INSTALL_BINARY=0
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
# VITE_* values are baked into the build.
ARG VITE_USER_ID=dev-user
ARG VITE_PRINTSCRIPT_VERSION=1.1
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV SNIPPET_SERVICE_URL=http://snippet-service:8080
EXPOSE 80
