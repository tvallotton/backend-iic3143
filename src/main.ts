import express from "express";
import cors from "cors";
import { env } from "process";
import publicationsRouter from "./publications/routes";
import user from "./user/controller";
<<<<<<< HEAD
=======
import cors from "cors";


>>>>>>> origin/develop

const app = express();
const port = env["PORT"] || 8080;

<<<<<<< HEAD
const corsOptions = {
    origin: "http://localhost:5173"
};

app.use(cors(corsOptions));

=======
app.use(cors());
>>>>>>> origin/develop
app.use("/", express.json());
app.use("/user", user);
app.use('/publications', publicationsRouter);

app.get("/", (_req, res) => {
    res.send("Hello Worlds!");
});


app.listen(port, () => {
    console.log(`Listening at http://127.0.0.1:${port}`);
});