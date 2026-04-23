# Menggunakan Node.js
# Mengunci secara spesifik di versi minor 22.22
FROM node:22.22-alpine

WORKDIR /app

# Copy daftar library dan install
COPY package*.json ./
RUN npm install

# Copy sisa file frontend
COPY . .

# Perintah khusus untuk Vite agar bisa diakses dari luar kontainer
CMD ["npm", "run", "dev", "--", "--host"]