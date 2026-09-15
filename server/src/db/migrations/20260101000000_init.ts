import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable("users", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("email").notNullable().unique();
      table.string("password_hash").notNullable();
      table.string("name").notNullable();
      table.timestamps(true, true);
    })
    .createTable("teams", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("name").notNullable();
      table.timestamps(true, true);
    })
    .createTable("team_members", (table) => {
      table.uuid("team_id").notNullable().references("id").inTable("teams").onDelete("CASCADE");
      table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.enu("role", ["owner", "admin", "member"]).notNullable().defaultTo("member");
      table.timestamps(true, true);
      table.primary(["team_id", "user_id"]);
    })
    .createTable("tasks", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("team_id").notNullable().references("id").inTable("teams").onDelete("CASCADE");
      table.string("title").notNullable();
      table.text("description");
      table.enu("status", ["todo", "in-progress", "done"]).notNullable().defaultTo("todo");
      table.enu("priority", ["low", "medium", "high"]).notNullable().defaultTo("medium");
      table.uuid("assignee_id").references("id").inTable("users").onDelete("SET NULL");
      table.uuid("created_by").references("id").inTable("users").onDelete("SET NULL");
      table.timestamp("due_date");
      table.timestamps(true, true);
    })
    .createTable("comments", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("task_id").notNullable().references("id").inTable("tasks").onDelete("CASCADE");
      table.uuid("author_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.text("body").notNullable();
      table.timestamps(true, true);
    })
    .createTable("media", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("url").notNullable();
      table.string("content_type").notNullable();
      table.uuid("uploaded_by").notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.uuid("task_id").references("id").inTable("tasks").onDelete("CASCADE");
      table.uuid("comment_id").references("id").inTable("comments").onDelete("CASCADE");
      table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .dropTableIfExists("media")
    .dropTableIfExists("comments")
    .dropTableIfExists("tasks")
    .dropTableIfExists("team_members")
    .dropTableIfExists("teams")
    .dropTableIfExists("users");
}
