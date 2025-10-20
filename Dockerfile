# Dockerfile (Final Version with Build Step)

FROM node:18
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# --- THIS IS THE CRITICAL FIX ---
# Run the build script from your package.json to create the /dist folder
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]