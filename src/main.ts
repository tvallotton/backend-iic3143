import express from "express";
import { env } from "process";

console.log(env);


const app = express();
const port = env["PORT"] || 8080;

app.get('/', (_req, res) => {
    res.send('Hello Worlds!');
});

app.listen(port, () => {
    console.log(`Listening at http://127.0.0.1:${port}`);
});