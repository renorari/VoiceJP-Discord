import express from "express";
import fs from "node:fs";

const app = express();

const port = process.env.PORT || 3000;
const errorPage = fs.readFileSync("error.html", "utf-8");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use((req, res) => {
    res.status(404).send(errorPage);
});

app.listen(port, () => {
    console.log(`Web server is listening on http://localhost:${port}`);
});

export default app;