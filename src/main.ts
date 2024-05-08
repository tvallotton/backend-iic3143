import express from "express";
import { env } from "process";
import publicationsRouter from "./routes/publications";


const app = express();
const port = env["PORT"] || 8080;

app.get('/', (_req, res) => {
    res.send('Hello World!');
});

app.use('/publications', publicationsRouter);

app.listen(port, () => {
    console.log(`Listening at http://127.0.0.1:${port}`);
});