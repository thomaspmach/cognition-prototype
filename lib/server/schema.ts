import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { statuses } from "../kyc/model";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  role: text("role", { enum: ["viewer", "reviewer"] }).notNull().default("viewer"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [check("user_role", sql`${table.role} in ('viewer', 'reviewer')`)]);

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (table) => [index("session_user").on(table.userId)]);

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("account_user").on(table.userId),
  uniqueIndex("account_provider").on(table.providerId, table.accountId),
]);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("verification_identifier").on(table.identifier)]);

export const cases = sqliteTable("kyc_case", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  country: text("country").notNull(),
  submittedAt: text("submitted_at").notNull(),
  status: text("status", { enum: statuses }).notNull().default("pending"),
  assigneeId: text("assignee_id").references(() => user.id),
  reviewReason: text("review_reason"),
  riskScore: real("risk_score").notNull(),
  version: integer("version").notNull().default(0),
}, (table) => [
  index("case_status").on(table.status),
  index("case_assignee").on(table.assigneeId),
  check("case_status_value", sql`${table.status} in ('pending', 'approved', 'rejected', 'escalated')`),
  check("case_version", sql`${table.version} >= 0`),
]);

export const caseEvents = sqliteTable("case_event", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => cases.id),
  actorId: text("actor_id").notNull().references(() => user.id),
  createdAt: text("created_at").notNull(),
  kind: text("kind", { enum: ["assignment", "decision"] }).notNull(),
  fromStatus: text("from_status", { enum: statuses }).notNull(),
  toStatus: text("to_status", { enum: statuses }).notNull(),
  fromAssigneeId: text("from_assignee_id").references(() => user.id),
  toAssigneeId: text("to_assignee_id").references(() => user.id),
  reason: text("reason"),
  version: integer("version").notNull(),
}, (table) => [
  uniqueIndex("event_case_version").on(table.caseId, table.version),
  index("event_case").on(table.caseId),
]);
