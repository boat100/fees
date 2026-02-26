import { pgTable, serial, timestamp, varchar, integer, decimal, text, boolean, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"

// 系统健康检查表（保留）
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 学生表
export const students = pgTable(
  "students",
  {
    id: serial().notNull().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    studentNumber: varchar("student_number", { length: 50 }).notNull().unique(),
    className: varchar("class_name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("students_student_number_idx").on(table.studentNumber),
    index("students_class_name_idx").on(table.className),
  ]
);

// 费用表
export const fees = pgTable(
  "fees",
  {
    id: serial().notNull().primaryKey(),
    studentId: integer("student_id").notNull().references(() => students.id),
    feeType: varchar("fee_type", { length: 50 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    status: boolean("status").default(false).notNull(), // false: 未缴费, true: 已缴费
    remark: text("remark"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("fees_student_id_idx").on(table.studentId),
    index("fees_status_idx").on(table.status),
  ]
);

// 使用 createSchemaFactory 配置 date coercion
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// Student Zod schemas
export const insertStudentSchema = createCoercedInsertSchema(students).pick({
  name: true,
  studentNumber: true,
  className: true,
  phone: true,
  email: true,
});

export const updateStudentSchema = createCoercedInsertSchema(students)
  .pick({
    name: true,
    studentNumber: true,
    className: true,
    phone: true,
    email: true,
  })
  .partial();

// Fee Zod schemas
export const insertFeeSchema = createCoercedInsertSchema(fees).pick({
  studentId: true,
  feeType: true,
  amount: true,
  status: true,
  remark: true,
});

export const updateFeeSchema = createCoercedInsertSchema(fees)
  .pick({
    feeType: true,
    amount: true,
    status: true,
    remark: true,
  })
  .partial();

// TypeScript types
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type UpdateStudent = z.infer<typeof updateStudentSchema>;
export type Fee = typeof fees.$inferSelect;
export type InsertFee = z.infer<typeof insertFeeSchema>;
export type UpdateFee = z.infer<typeof updateFeeSchema>;
