CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`created_at` text NOT NULL,
	`focus_mode` text NOT NULL,
	`files` text DEFAULT '[]',
	`ragflow_session_id` text,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chats_ragflow_session_id_unique` ON `chats` (`ragflow_session_id`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `chats` (`user_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`chatId` text NOT NULL,
	`messageId` text NOT NULL,
	`type` text,
	`metadata` text
);
