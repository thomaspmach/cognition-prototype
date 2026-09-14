CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_provider` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `case_event` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` text NOT NULL,
	`kind` text NOT NULL,
	`from_status` text NOT NULL,
	`to_status` text NOT NULL,
	`from_assignee_id` text,
	`to_assignee_id` text,
	`reason` text,
	`version` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `kyc_case`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_assignee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_assignee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_case_version` ON `case_event` (`case_id`,`version`);--> statement-breakpoint
CREATE INDEX `event_case` ON `case_event` (`case_id`);--> statement-breakpoint
CREATE TABLE `kyc_case` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`country` text NOT NULL,
	`submitted_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`assignee_id` text,
	`review_reason` text,
	`risk_score` real NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`assignee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "case_status_value" CHECK("kyc_case"."status" in ('pending', 'approved', 'rejected', 'escalated')),
	CONSTRAINT "case_version" CHECK("kyc_case"."version" >= 0)
);
--> statement-breakpoint
CREATE INDEX `case_status` ON `kyc_case` (`status`);--> statement-breakpoint
CREATE INDEX `case_assignee` ON `kyc_case` (`assignee_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "user_role" CHECK("user"."role" in ('viewer', 'reviewer'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier` ON `verification` (`identifier`);