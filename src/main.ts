import express from "express";
import cors from "cors";
import { env } from "process";
import publicationsRouter from "./publications/routes";


const app = express();
const port = env["PORT"] || 8080;

const corsOptions = {
    origin: "http://localhost:5173"
};

app.use(cors(corsOptions));

app.get('/', (_req, res) => {
    res.send('Hello World!');
});

app.use('/publications', publicationsRouter);

app.listen(port, () => {
    console.log(`Listening at http://127.0.0.1:${port}`);
});