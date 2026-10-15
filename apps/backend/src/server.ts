import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);

createApp().listen(port, () => {
  console.log(`AllAmericanEnergy API listening on ${port}`);
});
