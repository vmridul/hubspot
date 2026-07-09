import "dotenv/config";
import { app } from "./app.js";
import { startBoss } from "./jobs/boss.js";
import { registerWorkers } from "./jobs/workers.js";

try {
  const port = process.env.PORT;

  await startBoss();
  await registerWorkers();

  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
} catch (error) {
  console.error(error);
  process.exit(1);
}
