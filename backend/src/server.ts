import { env } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Carbon Commit backend running on http://localhost:${env.port}`);
});