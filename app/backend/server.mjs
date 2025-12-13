import { connectDB } from "./src/db.mjs";
//import { seed } from "./src/seeder.mjs";
import { app } from "./src/app.mjs";
//import { resetDatabase } from "./src/resetDB.mjs";

const PORT = process.env.PORT;



await connectDB();

//await resetDatabase();

//await seed();

app.listen(PORT, () => {
    console.log(`Static HTTP server listening on ${PORT}`);
});