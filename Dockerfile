# Node.js rasmi image
FROM node:18

# Ishchi papka
WORKDIR /app

# Loyihaning hamma fayllarini konteynerga nusxalash
COPY . .

# json-server global o‘rnatish
RUN npm install -g json-server

# Port ochish (Render bu portni ishlatadi)
EXPOSE 10000

# json-server ishga tushirish
CMD ["json-server", "--host", "0.0.0.0", "--port", "10000", "--watch", "db.json"]
