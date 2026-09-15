import knex from "knex";
import knexConfig from "../db/knexfile.js";

export const db = knex(knexConfig);
