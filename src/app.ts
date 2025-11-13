import knex, { migrate, seed } from "#postgres/knex.js";

await migrate.latest();
await seed.run();

console.log("All migrations and seeds have been run");