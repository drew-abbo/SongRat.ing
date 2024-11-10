FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf

COPY src/ /usr/share/nginx/html/

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
