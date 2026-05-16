import { db } from "./db";
import {
  scores,
  races,
  raceResults,
  type Score,
  type InsertScore,
  type Race,
  type RaceResult,
  type InsertRaceResult,
} from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  getScores(): Promise<Score[]>;
  createScore(score: InsertScore): Promise<Score>;
  createRace(id: string, playerCount: number): Promise<void>;
  createRaceResult(result: InsertRaceResult): Promise<RaceResult>;
  getRaceResults(raceId: string): Promise<RaceResult[]>;
}

export class DatabaseStorage implements IStorage {
  async getScores(): Promise<Score[]> {
    if (!db) return [];
    return await db.select().from(scores).orderBy(desc(scores.score)).limit(10);
  }

  async createScore(insertScore: InsertScore): Promise<Score> {
    if (!db) throw new Error("Database not configured");
    const [score] = await db.insert(scores).values(insertScore).returning();
    return score;
  }

  async createRace(id: string, playerCount: number): Promise<void> {
    if (!db) return;
    await db.insert(races).values({ id, playerCount });
  }

  async createRaceResult(result: InsertRaceResult): Promise<RaceResult> {
    if (!db) throw new Error("Database not configured");
    const [row] = await db.insert(raceResults).values(result).returning();
    return row;
  }

  async getRaceResults(raceId: string): Promise<RaceResult[]> {
    if (!db) return [];
    return await db
      .select()
      .from(raceResults)
      .where(eq(raceResults.raceId, raceId))
      .orderBy(raceResults.position);
  }
}

export const storage = new DatabaseStorage();
