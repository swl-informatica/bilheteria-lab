FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-app-config.sh /docker-entrypoint.d/40-app-config.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-app-config.sh \
    && chmod +x /docker-entrypoint.d/40-app-config.sh
COPY public /usr/share/nginx/html

EXPOSE 80
