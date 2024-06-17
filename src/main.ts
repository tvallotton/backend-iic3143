import express from "express";
import cors from "cors";
import { env } from "process";
import publicationsRouter from "./publications/routes.js";
import user from "./user/controller.js";
import reviewsRouter from "./reviews/routes.js";

const app = express();
const port = env["PORT"] || 8080;


app.use(cors());

app.use("/", express.json());
app.use("/user", user);
app.use('/publications', publicationsRouter);
app.use("/reviews", reviewsRouter);

app.get("/", (_req, res) => {
    res.send("Hello Worlds!");
});


app.listen(port, () => {
    console.log(`Listening at http://127.0.0.1:${port}`);
});