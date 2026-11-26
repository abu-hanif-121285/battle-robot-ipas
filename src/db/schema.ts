import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

// ─── Users (teacher & student accounts) ──────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"), // 'teacher' | 'student'
  displayName: text("display_name").notNull().default("RoboLearner"),
  className: text("class_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── IPAS Kelas 6 question bank (editable by teachers) ───────────────────────
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  materi: text("materi").notNull(), // 'Sistem Pencernaan Manusia' | 'Sistem Pernapasan Manusia' | 'Sistem Tata Surya' | 'Jejak Sang Pahlawan'
  pertanyaan: text("pertanyaan").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  kunci: text("kunci").notNull(), // 'A' | 'B' | 'C' | 'D'
  pembahasan: text("pembahasan").notNull().default(""),
  difficulty: text("difficulty").notNull().default("sedang"), // 'mudah' | 'sedang' | 'sulit'
  demo: boolean("demo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Classes made by teachers ─────────────────────────────────────────────────
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teacherUsername: text("teacher_username").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull(),
  nis: text("nis").notNull().default(""),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Match results (submitted by game client at end of a match) ───────────────
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  heroId: text("hero_id").notNull(),
  heroName: text("hero_name").notNull(),
  difficulty: text("difficulty").notNull().default("normal"),
  result: text("result").notNull(), // 'victory' | 'defeat'
  kills: integer("kills").notNull().default(0),
  deaths: integer("deaths").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  goldEarned: integer("gold_earned").notNull().default(0),
  damageDealt: integer("damage_dealt").notNull().default(0),
  turretsDestroyed: integer("turrets_destroyed").notNull().default(0),
  questionsCorrect: integer("questions_correct").notNull().default(0),
  questionsWrong: integer("questions_wrong").notNull().default(0),
  knowledgeXp: integer("knowledge_xp").notNull().default(0),
  mvp: boolean("mvp").notNull().default(false),
  durationSec: integer("duration_sec").notNull().default(0),
  demo: boolean("demo").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Key-value settings (e.g. quiz frequency per match) ──────────────────────
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
