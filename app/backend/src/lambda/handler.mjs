import serverless from "serverless-http";
import { app } from "../app.mjs";

export const handler = serverless(app, {
    request: (req, event) => {
        const stage = event?.requestContext?.stage; // "prod"
        if (stage && req.url?.startsWith(`/${stage}`)) {
            req.url = req.url.slice(stage.length + 1) || "/"; // "/api/libros"
        }
    },
});
