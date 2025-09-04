# Nginx image dan foydalanamiz
FROM nginx:alpine

# Statik fayllarni Nginxning default papkasiga ko'chiramiz
COPY . /usr/share/nginx/html

# Port 80 ni ochamiz
EXPOSE 80

# Nginxni ishga tushiramiz
CMD ["nginx", "-g", "daemon off;"]
