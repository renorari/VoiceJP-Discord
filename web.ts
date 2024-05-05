import fs from "node:fs";
import express from "express";

const app = express();

const errorPage = fs.readFileSync("error.html", "utf-8");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use((req, res) => {
    res.status(404).send(errorPage);
});

export default app;