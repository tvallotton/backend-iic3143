FROM node as dev
WORKDIR /home/app
COPY . .
RUN npm i
CMD ["npm", "run", "dev"]

FROM node as prod
WORKDIR /home/app
COPY . .
RUN npm i
RUN npm run build
RUN useradd app -d /home/app
RUN npm prune --omit=dev
USER app
CMD [ "node", "dist/main.js" ]
