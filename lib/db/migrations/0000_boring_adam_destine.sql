CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"document" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"sku" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"qty" integer DEFAULT 0 NOT NULL,
	"min_qty" integer DEFAULT 0 NOT NULL,
	"unit" text NOT NULL,
	"location" text NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'Disponível' NOT NULL,
	"image_url" text,
	"weight" double precision,
	"last_updated" text
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"product" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"line" text NOT NULL,
	"priority" text DEFAULT 'Média' NOT NULL,
	"status" text DEFAULT 'A Fazer' NOT NULL,
	"supervisor" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"date" text NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"operator" text,
	"sales_order_id" text,
	"sales_order_client" text
);
--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"size" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"date" text NOT NULL,
	"url" text,
	"associated_op" text
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"client" text NOT NULL,
	"client_document" text,
	"date" text NOT NULL,
	"delivery_date" text,
	"items" text NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'Rascunho' NOT NULL,
	"payment_method" text DEFAULT 'Boleto' NOT NULL,
	"payment_status" text DEFAULT 'Pendente' NOT NULL,
	"operator" text NOT NULL,
	"notes" text,
	"products" jsonb DEFAULT '[]'::jsonb NOT NULL
);
