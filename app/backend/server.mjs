import {db} from "./model/db/db.mjs";
import { app } from "./src/app.mjs";
import {seed} from "./src/seeder.mjs";

const PORT = process.env.PORT;

//db.createTable("Books");
//db.createTable("Users");
//db.createTable("Carts");
//db.createTable("Orders");   


//await seed();

//app.listen(PORT, () => {console.log(`Static HTTP server listening on ${PORT}`);});