FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
RUN npm install --workspace client

COPY client ./client

WORKDIR /app/client

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
