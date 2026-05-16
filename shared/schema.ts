import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  score: integer("score").notNull(),
  timeTaken: integer("time_taken").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const races = pgTable("races", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at").defaultNow(),
  playerCount: integer("player_count").notNull(),
});

export const raceResults = pgTable("race_results", {
  id: serial("id").primaryKey(),
  raceId: text("race_id").notNull().references(() => races.id),
  username: text("username").notNull(),
  score: integer("score").notNull(),
  timeTaken: integer("time_taken").notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScoreSchema = createInsertSchema(scores).omit({
  id: true,
  createdAt: true,
});

export type Score = typeof scores.$inferSelect;
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Race = typeof races.$inferSelect;
export type RaceResult = typeof raceResults.$inferSelect;
export type InsertRaceResult = {
  raceId: string;
  username: string;
  score: number;
  timeTaken: number;
  position: number;
};

export type CreateScoreRequest = InsertScore;
export type ScoreResponse = Score;
