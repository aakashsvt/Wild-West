import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  score: integer("score").notNull(), // Distance traveled or points
  timeTaken: integer("time_taken").notNull(), // In seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScoreSchema = createInsertSchema(scores).omit({ 
  id: true, 
  createdAt: true 
});

export type Score = typeof scores.$inferSelect;
export type InsertScore = z.infer<typeof insertScoreSchema>;

export type CreateScoreRequest = InsertScore;
export type ScoreResponse = Score;
