import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { sql, inArray } from "drizzle-orm";

// Mark as dynamic since we interact with a live database
export const dynamic = "force-dynamic";

// Self-healing migration executor
// Self-healing migration verification and SQL exporter
const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"document" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"segment" text,
	"status" text,
	"credit_balance" double precision DEFAULT 0,
	"credit_history" jsonb DEFAULT '[]'::jsonb,
	"nickname" text
);

CREATE TABLE IF NOT EXISTS "inventory_items" (
	"sku" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"qty" double precision DEFAULT 0 NOT NULL,
	"min_qty" double precision DEFAULT 0 NOT NULL,
	"unit" text NOT NULL,
	"location" text NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'Disponível' NOT NULL,
	"image_url" text,
	"weight" double precision,
	"last_updated" text,
	"stages" jsonb DEFAULT '[]'::jsonb,
	"active" boolean DEFAULT true,
	"operator" text,
	"purchase_price" double precision DEFAULT 0,
	"sales_price" double precision DEFAULT 0,
	"updated_at" text
);

CREATE TABLE IF NOT EXISTS "production_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"product" text NOT NULL,
	"qty" double precision DEFAULT 1 NOT NULL,
	"line" text NOT NULL,
	"priority" text DEFAULT 'Média' NOT NULL,
	"status" text DEFAULT 'A Fazer' NOT NULL,
	"supervisor" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"date" text NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"operator" text,
	"sales_order_id" text,
	"sales_order_client" text,
	"note" text,
	"stage_supervisors" jsonb DEFAULT '{}'::jsonb,
	"updated_at" text
);

CREATE TABLE IF NOT EXISTS "project_files" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"size" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"date" text NOT NULL,
	"url" text,
	"associated_op" text
);

CREATE TABLE IF NOT EXISTS "sales_orders" (
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
	"products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"serial_number" integer DEFAULT 0,
	"project_files" jsonb DEFAULT '[]'::jsonb,
	"project_images" jsonb DEFAULT '[]'::jsonb,
	"updated_at" text
);

CREATE TABLE IF NOT EXISTS "collaborators" (
	"name" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'Ativo' NOT NULL,
	"last_login" text,
	"email" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"restrict_to_work_hours" boolean DEFAULT false NOT NULL,
	"access_window_start" text DEFAULT '08:00' NOT NULL,
	"access_window_end" text DEFAULT '18:00' NOT NULL,
	"hide_order_values" boolean DEFAULT false,
	"pin" text NOT NULL,
	"allowed_tabs" jsonb DEFAULT '[]'::jsonb,
	"updated_at" text
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier" text NOT NULL,
	"value" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'Rascunho' NOT NULL,
	"date" text NOT NULL,
	"operator" text,
	"updated_at" text
);

CREATE TABLE IF NOT EXISTS "financial_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"due_date" text NOT NULL,
	"payment_date" text,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	"client_or_supplier" text,
	"payment_method" text,
	"notes" text,
	"sales_order_id" text,
	"purchase_order_id" text,
	"updated_at" text
);

CREATE TABLE IF NOT EXISTS "system_parameters" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text DEFAULT 'Estilo Coifas' NOT NULL,
	"company_cnpj" text DEFAULT '12.345.678/0001-90' NOT NULL,
	"company_email" text DEFAULT 'comercial@estilocoifas.com.br' NOT NULL,
	"company_phone" text DEFAULT '(11) 4002-8922' NOT NULL,
	"company_address" text DEFAULT 'Rua Industrial, 1000 - São Paulo, SP' NOT NULL,
	"company_logo" text DEFAULT '',
	"default_currency" text DEFAULT 'BRL' NOT NULL,
	"target_profit_margin" double precision DEFAULT 20 NOT NULL,
	"default_delivery_lead_time" integer DEFAULT 15 NOT NULL,
	"max_discount_allowed" double precision DEFAULT 10 NOT NULL,
	"alert_risk_days" integer DEFAULT 3 NOT NULL,
	"enable_delay_alerts" boolean DEFAULT true NOT NULL,
	"enable_low_stock_alerts" boolean DEFAULT true NOT NULL,
	"enable_auto_backup" boolean DEFAULT false NOT NULL,
	"industrial_segments" jsonb DEFAULT '[]'::jsonb,
	"updated_at" text
);`;

function enhanceDatabaseError(error: any, databaseUrl: string): string {
  const message = String(error?.message || "").toLowerCase();
  const causeObj = error?.cause || error;
  const causeMessage = String(causeObj?.message || causeObj?.detail || causeObj || "").toLowerCase();
  const causeCode = String(causeObj?.code || error?.code || "").toLowerCase();
  const code = String(error?.code || causeObj?.code || "").toLowerCase();

  const isLocalhostFallback = !databaseUrl || databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
  if (isLocalhostFallback) {
    return "Erro de Conexão com Banco de Dados: A variável de ambiente DATABASE_URL não foi configurada ou está utilizando o endereço local padrão (localhost). Para conectar ao seu banco em nuvem (Supabase, Hostinger, Neon, etc.), configure a variável DATABASE_URL nas Configurações da aplicação no painel do Google AI Studio com a Connection String PostgreSQL válida.";
  }

  // Check if it's a Supabase direct host connection on 5432 (IPv6 issue on many cloud hosts)
  if (databaseUrl.includes("supabase") || databaseUrl.includes("supabase.co")) {
    const isDirectConnection = 
      databaseUrl.includes(".supabase.co") && 
      !databaseUrl.includes("pooler.supabase.com") && 
      !databaseUrl.includes(":6543");
      
    if (isDirectConnection) {
      return "Erro de conexão com Supabase (IPv6 detectado): O host direto do Supabase (db.xxxx.supabase.co na porta 5432) exige suporte a IPv6. Como a maioria das hospedagens suportam conexões apenas via IPv4, a conexão falha. Para corrigir, acesse o painel do Supabase em Project Settings > Database, copie a Connection String do 'Connection Pooler' (porta 6543, host contendo 'pooler.supabase.com') e atualize a variável DATABASE_URL. O Pooler suporta IPv4 e funcionará com 100% de sucesso!";
    }
  }

  // Check for password authentication failures
  const isAuthError = 
    message.includes("password authentication failed") || 
    causeMessage.includes("password authentication failed") ||
    message.includes("authentication failed") ||
    causeMessage.includes("authentication failed") ||
    code === "28p01" ||
    causeCode === "28p01";

  if (isAuthError) {
    return "Erro de Autenticação (Senha Incorreta): A senha do banco de dados especificada na sua DATABASE_URL está incorreta. Certifique-se de ter substituído '[YOUR-PASSWORD]' pela senha real do seu banco de dados em Project Settings > Database nas configurações do Supabase ou da sua hospedagem.";
  }

  // Check if it looks like a network connection error / timeout / resolve error / ECONNREFUSED
  const isNetworkError = 
    code === "etimedout" || 
    code === "econnrefused" || 
    code === "eaddrnotavail" || 
    code === "enotfound" ||
    causeCode === "etimedout" || 
    causeCode === "econnrefused" || 
    causeCode === "eaddrnotavail" || 
    causeCode === "enotfound" ||
    message.includes("timeout") || 
    message.includes("timed out") || 
    message.includes("connection") || 
    message.includes("connect") || 
    message.includes("getaddrinfo") ||
    message.includes("socket") ||
    message.includes("refused") ||
    causeMessage.includes("timeout") || 
    causeMessage.includes("timed out") || 
    causeMessage.includes("connection") || 
    causeMessage.includes("connect") || 
    causeMessage.includes("getaddrinfo") ||
    causeMessage.includes("socket") ||
    causeMessage.includes("refused");

  if (isNetworkError) {
    return `Erro de Conexão com o Banco de Dados (Timeout / Rede / Recusado): Não foi possível conectar ao servidor de banco de dados no host configurado. Verifique se o banco de dados está ativo, se a porta e credenciais na variável DATABASE_URL estão corretas e se o servidor aceita conexões externas. Causa técnica: ${causeMessage || message || code}`;
  }

  // Extract detailed error description
  let detailedCause = causeObj?.message || causeObj?.detail || (typeof causeObj === 'string' ? causeObj : '');
  if (!detailedCause && error?.cause) {
    try {
      detailedCause = JSON.stringify(error.cause);
    } catch {
      detailedCause = String(error.cause);
    }
  }

  let errMsg = error?.message || "Erro de consulta ao banco de dados.";
  if (detailedCause && detailedCause !== "{}" && !errMsg.includes(detailedCause)) {
    errMsg += ` (Causa: ${detailedCause})`;
  } else if (causeCode) {
    errMsg += ` (Código: ${causeCode})`;
  }
  return errMsg;
}

async function ensureTablesExist(db: any) {
  if ((globalThis as any).tablesVerified) {
    return;
  }

  const tables = ["customers", "inventory_items", "production_orders", "project_files", "sales_orders", "collaborators", "purchase_orders", "financial_transactions", "system_parameters", "commission_payouts"];
  
  for (const tableName of tables) {
    let exists = false;
    try {
      // Query information_schema to check existence without causing a query failure/error in Postgres
      const result = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        ) AS "exists";
      `));
      
      const rows = Array.isArray(result) ? result : (result?.rows || []);
      if (rows && rows.length > 0) {
        const firstRow = rows[0];
        for (const key of Object.keys(firstRow)) {
          const val = firstRow[key];
          if (val === true || val === "true" || val === 1 || val === "1" || val === "t") {
            exists = true;
            break;
          }
        }
      }
      
      console.log(`Table "${tableName}" verification. Exists: ${exists}`);
    } catch (err: any) {
      console.error(`Error checking existence of "${tableName}" via information_schema:`, err);
      // Let genuine connection/auth/SSL errors bubble up immediately!
      throw err;
    }

    if (!exists) {
      console.log(`Table "${tableName}" is missing. Attempting auto-creation...`);
      try {
        if (tableName === "customers") {
          await db.execute(sql`
            CREATE TABLE "customers" (
              "id" text PRIMARY KEY NOT NULL,
              "name" text NOT NULL,
              "document" text NOT NULL,
              "email" text NOT NULL,
              "phone" text NOT NULL,
              "address" text NOT NULL,
              "city" text NOT NULL,
              "state" text NOT NULL,
              "zip" text NOT NULL,
              "segment" text,
              "status" text,
              "credit_balance" double precision DEFAULT 0,
              "credit_history" jsonb DEFAULT '[]'::jsonb,
              "nickname" text,
              "updated_at" text
            );
          `);
        } else if (tableName === "inventory_items") {
          await db.execute(sql`
            CREATE TABLE "inventory_items" (
              "sku" text PRIMARY KEY NOT NULL,
              "name" text NOT NULL,
              "category" text NOT NULL,
              "qty" double precision DEFAULT 0 NOT NULL,
              "min_qty" double precision DEFAULT 0 NOT NULL,
              "unit" text NOT NULL,
              "location" text NOT NULL,
              "price" double precision DEFAULT 0 NOT NULL,
              "status" text DEFAULT 'Disponível' NOT NULL,
              "image_url" text,
              "weight" double precision,
              "last_updated" text,
              "stages" jsonb DEFAULT '[]'::jsonb,
              "updated_at" text
            );
          `);
        } else if (tableName === "production_orders") {
          await db.execute(sql`
            CREATE TABLE "production_orders" (
              "id" text PRIMARY KEY NOT NULL,
              "product" text NOT NULL,
              "qty" double precision DEFAULT 1 NOT NULL,
              "line" text NOT NULL,
              "priority" text DEFAULT 'Média' NOT NULL,
              "status" text DEFAULT 'A Fazer' NOT NULL,
              "supervisor" text NOT NULL,
              "progress" integer DEFAULT 0 NOT NULL,
              "date" text NOT NULL,
              "files" jsonb DEFAULT '[]'::jsonb NOT NULL,
              "operator" text,
              "sales_order_id" text,
              "sales_order_client" text,
              "note" text,
              "stage_supervisors" jsonb DEFAULT '{}'::jsonb,
              "updated_at" text
            );
          `);
        } else if (tableName === "project_files") {
          await db.execute(sql`
            CREATE TABLE "project_files" (
              "id" text PRIMARY KEY NOT NULL,
              "name" text NOT NULL,
              "size" text NOT NULL,
              "uploaded_by" text NOT NULL,
              "date" text NOT NULL,
              "url" text,
              "associated_op" text
            );
          `);
        } else if (tableName === "sales_orders") {
          await db.execute(sql`
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
              "last_operator" text,
              "notes" text,
              "products" jsonb DEFAULT '[]'::jsonb NOT NULL,
              "serial_number" integer DEFAULT 0,
              "project_files" jsonb DEFAULT '[]'::jsonb,
              "project_images" jsonb DEFAULT '[]'::jsonb,
              "updated_at" text
            );
          `);
        } else if (tableName === "collaborators") {
          await db.execute(sql`
            CREATE TABLE "collaborators" (
              "name" text PRIMARY KEY NOT NULL,
              "role" text NOT NULL,
              "status" text DEFAULT 'Ativo' NOT NULL,
              "last_login" text,
              "email" text NOT NULL,
              "permissions" jsonb NOT NULL,
              "restrict_to_work_hours" boolean DEFAULT false NOT NULL,
              "access_window_start" text DEFAULT '08:00' NOT NULL,
              "access_window_end" text DEFAULT '18:00' NOT NULL,
              "hide_order_values" boolean DEFAULT false,
              "pin" text NOT NULL,
              "allowed_tabs" jsonb DEFAULT '[]'::jsonb,
              "commission_eligible" boolean DEFAULT false,
              "commission_percentage" double precision DEFAULT 0,
              "updated_at" text
            );
          `);
        } else if (tableName === "purchase_orders") {
          await db.execute(sql`
            CREATE TABLE "purchase_orders" (
              "id" text PRIMARY KEY NOT NULL,
              "supplier" text NOT NULL,
              "value" double precision DEFAULT 0 NOT NULL,
              "status" text DEFAULT 'Rascunho' NOT NULL,
              "date" text NOT NULL,
              "operator" text,
              "updated_at" text
            );
          `);
        } else if (tableName === "financial_transactions") {
          await db.execute(sql`
            CREATE TABLE "financial_transactions" (
              "id" text PRIMARY KEY NOT NULL,
              "description" text NOT NULL,
              "type" text NOT NULL,
              "category" text NOT NULL,
              "amount" double precision DEFAULT 0 NOT NULL,
              "due_date" text NOT NULL,
              "payment_date" text,
              "status" text DEFAULT 'PENDENTE' NOT NULL,
              "client_or_supplier" text,
              "payment_method" text,
              "notes" text,
              "sales_order_id" text,
              "purchase_order_id" text,
              "updated_at" text
            );
          `);
        } else if (tableName === "system_parameters") {
          await db.execute(sql`
            CREATE TABLE "system_parameters" (
              "id" text PRIMARY KEY NOT NULL,
              "company_name" text DEFAULT 'Estilo Coifas' NOT NULL,
              "company_cnpj" text DEFAULT '12.345.678/0001-90' NOT NULL,
              "company_email" text DEFAULT 'comercial@estilocoifas.com.br' NOT NULL,
              "company_phone" text DEFAULT '(11) 4002-8922' NOT NULL,
              "company_address" text DEFAULT 'Rua Industrial, 1000 - São Paulo, SP' NOT NULL,
              "company_logo" text DEFAULT '',
              "default_currency" text DEFAULT 'BRL' NOT NULL,
              "target_profit_margin" double precision DEFAULT 20 NOT NULL,
              "default_delivery_lead_time" integer DEFAULT 15 NOT NULL,
              "max_discount_allowed" double precision DEFAULT 10 NOT NULL,
              "alert_risk_days" integer DEFAULT 3 NOT NULL,
              "enable_delay_alerts" boolean DEFAULT true NOT NULL,
              "enable_low_stock_alerts" boolean DEFAULT true NOT NULL,
              "enable_auto_backup" boolean DEFAULT false NOT NULL,
              "industrial_segments" jsonb DEFAULT '[]'::jsonb,
              "updated_at" text
            );
          `);
        } else if (tableName === "commission_payouts") {
          await db.execute(sql`
            CREATE TABLE "commission_payouts" (
              "id" text PRIMARY KEY NOT NULL,
              "collaborator_name" text NOT NULL,
              "amount" double precision DEFAULT 0 NOT NULL,
              "percentage" double precision DEFAULT 0 NOT NULL,
              "period_start" text NOT NULL,
              "period_end" text NOT NULL,
              "payment_date" text NOT NULL,
              "order_count" integer DEFAULT 0 NOT NULL,
              "sales_order_ids" jsonb DEFAULT '[]'::jsonb,
              "financial_transaction_id" text,
              "notes" text,
              "updated_at" text
            );
          `);
        }
        console.log(`Table "${tableName}" created successfully.`);
      } catch (createErr: any) {
        const createMsg = String(createErr?.message || "").toLowerCase();
        const createCode = String(createErr?.code || "").toLowerCase();
        if (createMsg.includes("already exists") || createCode === "42p07") {
          console.log(`Table "${tableName}" already exists in database.`);
        } else {
          console.error(`Error creating table "${tableName}":`, createErr);
          throw new Error(
            `MIGRATION_REQUIRED: A tabela "${tableName}" precisa ser criada no Supabase.`
          );
        }
      }
    } else {
      if (tableName === "sales_orders") {
        try {
          console.log(`Ensuring columns "serial_number", "last_operator", "updated_at", "project_files", "project_images" exist in "sales_orders"...`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "serial_number" integer DEFAULT 0;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "client_segment" text;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "last_operator" text;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "updated_at" text;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "project_files" jsonb DEFAULT '[]'::jsonb;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "project_images" jsonb DEFAULT '[]'::jsonb;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "boleto_paid" boolean DEFAULT false;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "boleto_due_date" text;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "paid_amount" double precision DEFAULT 0;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "boleto_installments" jsonb DEFAULT '[]'::jsonb;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "commission_percentage" double precision DEFAULT 0;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "commission_value" double precision DEFAULT 0;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "commission_paid" boolean DEFAULT false;`);
          await db.execute(sql`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "commission_payout_id" text;`);
          console.log(`Columns for "sales_orders" checked/added successfully.`);
        } catch (colErr: any) {
          console.error(`Error ensuring columns in "sales_orders":`, colErr);
        }
      }
      if (tableName === "inventory_items") {
        try {
          console.log(`Ensuring column "stages", "updated_at", "active", "operator", "purchase_price", and "sales_price" exist in "inventory_items"...`);
          await db.execute(sql`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "stages" jsonb DEFAULT '[]'::jsonb;`);
          await db.execute(sql`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "updated_at" text;`);
          await db.execute(sql`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true;`);
          await db.execute(sql`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "operator" text;`);
          await db.execute(sql`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "purchase_price" double precision DEFAULT 0;`);
          await db.execute(sql`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "sales_price" double precision DEFAULT 0;`);
          console.log(`Columns "stages", "updated_at", "active", "operator", "purchase_price" and "sales_price" checked/added successfully for inventory_items.`);
          
          console.log(`Converting columns "qty" and "min_qty" to double precision in "inventory_items"...`);
          await db.execute(sql`ALTER TABLE "inventory_items" ALTER COLUMN "qty" TYPE double precision;`);
          await db.execute(sql`ALTER TABLE "inventory_items" ALTER COLUMN "min_qty" TYPE double precision;`);
          console.log(`Columns "qty" and "min_qty" successfully converted/verified.`);
        } catch (colErr: any) {
          console.error(`Error ensuring columns/types in "inventory_items":`, colErr);
        }
      }
      if (tableName === "production_orders") {
        try {
          console.log(`Ensuring columns exist in "production_orders"...`);
          await db.execute(sql`ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "note" text;`);
          await db.execute(sql`ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "updated_at" text;`);
          await db.execute(sql`ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "stage_supervisors" jsonb DEFAULT '{}'::jsonb;`);
          console.log(`Columns "note", "updated_at", and "stage_supervisors" checked/added successfully for production_orders.`);

          console.log(`Converting column "qty" to double precision in "production_orders"...`);
          await db.execute(sql`ALTER TABLE "production_orders" ALTER COLUMN "qty" TYPE double precision;`);
          console.log(`Column "qty" successfully converted/verified.`);
        } catch (colErr: any) {
          console.error(`Error ensuring columns/types in "production_orders":`, colErr);
        }
      }
      if (tableName === "customers") {
        try {
          console.log(`Ensuring columns "segment", "status", "credit_balance", "credit_history", "nickname", and "updated_at" exist in "customers"...`);
          await db.execute(sql`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "segment" text DEFAULT 'Industrial';`);
          await db.execute(sql`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'Ativo';`);
          await db.execute(sql`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "credit_balance" double precision DEFAULT 0;`);
          await db.execute(sql`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "credit_history" jsonb DEFAULT '[]'::jsonb;`);
          await db.execute(sql`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "nickname" text;`);
          await db.execute(sql`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "updated_at" text;`);
          console.log(`Columns checked/added successfully for customers.`);
        } catch (colErr: any) {
          console.error(`Error ensuring columns in "customers":`, colErr);
        }
      }
      if (tableName === "collaborators") {
        try {
          console.log(`Ensuring columns "status", "last_login", "restrict_to_work_hours", "access_window_start", "access_window_end", "hide_order_values", "pin", "allowed_tabs", and "updated_at" exist in "collaborators"...`);
          await db.execute(sql`ALTER TABLE "collaborators" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'Ativo';`);
          await db.execute(sql`ALTER TABLE "collaborators" ADD COLUMN IF NOT EXISTS "last_login" text;`);
          await db.execute(sql`ALTER TABLE "collaborators" ADD COLUMN IF NOT EXISTS "restrict_to_work_hours" boolean DEFAULT false;`);
          await db.execute(sql`ALTER TABLE "collaborators" ADD COLUMN IF NOT EXISTS "access_window_start" text DEFAULT '08:00';`);
          await db.execute(sql`ALTER TABLE "collaborators" ADD COLUMN IF NOT EXISTS "access_window_end" text DEFAULT '18:00';`);
          await db.execute(sql`ALTER TABLE "collaborators" ADD COLUMN IF NOT EXISTS "hide_order_values" boolean DEFAULT false;`);
          await db.execute(sql`ALTER TABLE "collaborators" ADD COLUMN IF NOT EXISTS "pin" text DEFAULT '1234';`);
          await db.execute(sql`ALTER TABLE "collaborators" ADD COLUMN IF NOT EXISTS "allowed_tabs" jsonb DEFAULT '[]'::jsonb;`);
          await db.execute(sql`ALTER TABLE "collaborators" ADD COLUMN IF NOT EXISTS "commission_eligible" boolean DEFAULT false;`);
          await db.execute(sql`ALTER TABLE "collaborators" ADD COLUMN IF NOT EXISTS "commission_percentage" double precision DEFAULT 0;`);
          await db.execute(sql`ALTER TABLE "collaborators" ADD COLUMN IF NOT EXISTS "updated_at" text;`);
          console.log(`Columns checked/added successfully for collaborators.`);
        } catch (colErr: any) {
          console.error(`Error ensuring columns in "collaborators":`, colErr);
        }
      }
    }
  }
  (globalThis as any).tablesVerified = true;
}

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "DATABASE_URL environment variable is not defined. Please add it to your environment variables.",
          isConfigured: false,
        },
        { 
          status: 200,
          headers: {
            "Cache-Control": "no-store, max-age=0, must-revalidate",
            "CDN-Cache-Control": "no-store",
            "Vercel-CDN-Cache-Control": "no-store"
          }
        }
      );
    }

    const isValidUrl = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
    if (!isValidUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "A variável DATABASE_URL está configurada com um formato inválido (deve começar com postgres:// ou postgresql://). Certifique-se de que copiou a Connection String de banco do Supabase, e não a API key.",
          isConfigured: false,
        },
        { 
          status: 200,
          headers: {
            "Cache-Control": "no-store, max-age=0, must-revalidate",
            "CDN-Cache-Control": "no-store",
            "Vercel-CDN-Cache-Control": "no-store"
          }
        }
      );
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: "DATABASE_URL environment variable is not defined or invalid.",
          isConfigured: false,
        },
        { status: 200 }
      );
    }
    await ensureTablesExist(db);

    // Query each table individually with its own try-catch to prevent a single mismatch from crashing everything
    let dbInventory: any[] = [];
    let dbProduction: any[] = [];
    let dbProjectFiles: any[] = [];
    let dbSales: any[] = [];
    let dbCustomers: any[] = [];
    let dbCollaborators: any[] = [];
    let dbPurchaseOrders: any[] = [];
    let dbFinancialTransactions: any[] = [];
    let dbSystemParameters: any[] = [];
    let dbCommissionPayouts: any[] = [];

    try { dbInventory = await db.select().from(schema.inventoryItems); } catch (e) { console.error("Error reading inventory_items:", e); }
    try { dbProduction = await db.select().from(schema.productionOrders); } catch (e) { console.error("Error reading production_orders:", e); }
    try { dbProjectFiles = await db.select().from(schema.projectFiles); } catch (e) { console.error("Error reading project_files:", e); }
    try { dbSales = await db.select().from(schema.salesOrders); } catch (e) { console.error("Error reading sales_orders:", e); }
    try { dbCustomers = await db.select().from(schema.customers); } catch (e) { console.error("Error reading customers:", e); }
    try { dbCollaborators = await db.select().from(schema.collaborators); } catch (e) { console.error("Error reading collaborators:", e); }
    try { dbPurchaseOrders = await db.select().from(schema.purchaseOrders); } catch (e) { console.error("Error reading purchase_orders:", e); }
    try { dbFinancialTransactions = await db.select().from(schema.financialTransactions); } catch (e) { console.error("Error reading financial_transactions:", e); }
    try { dbSystemParameters = await db.select().from(schema.systemParameters); } catch (e) { console.error("Error reading system_parameters:", e); }
    try { dbCommissionPayouts = await db.select().from(schema.commissionPayouts); } catch (e) { console.error("Error reading commission_payouts:", e); }

    let finalCollaborators = dbCollaborators;
    // Automatically purge old default sample collaborators if they exist in DB
    const defaultNamesToPurge = ['Eduardo Fontes', 'Ana Paula', 'Carlos Eduardo', 'Fernanda Souza', 'Marcos Silva'];
    const hasDefaultSample = dbCollaborators.some(c => defaultNamesToPurge.includes(c.name));
    if (hasDefaultSample) {
      try {
        await db.delete(schema.collaborators).where(inArray(schema.collaborators.name, defaultNamesToPurge));
        dbCollaborators = await db.select().from(schema.collaborators);
        finalCollaborators = dbCollaborators;
      } catch (purgeErr) {
        console.error("Error purging default collaborators from DB:", purgeErr);
      }
    }

    let finalSystemParameters = dbSystemParameters;
    if (dbSystemParameters.length === 0) {
      const defaultParams = {
        id: 'system_config',
        companyName: 'Estilo Coifas',
        companyCnpj: '12.345.678/0001-90',
        companyEmail: 'comercial@estilocoifas.com.br',
        companyPhone: '(11) 4002-8922',
        companyAddress: 'Rua Industrial, 1000 - São Paulo, SP',
        companyLogo: '',
        defaultCurrency: 'BRL',
        targetProfitMargin: 20,
        defaultDeliveryLeadTime: 15,
        maxDiscountAllowed: 10,
        alertRiskDays: 3,
        enableDelayAlerts: true,
        enableLowStockAlerts: true,
        enableAutoBackup: false,
        industrialSegments: [],
        updatedAt: new Date().toISOString()
      };

      try {
        await db.insert(schema.systemParameters).values(defaultParams);
        console.log("Seeded default system parameters successfully!");
        finalSystemParameters = await db.select().from(schema.systemParameters);
      } catch (seedErr) {
        console.error("Error seeding default system parameters:", seedErr);
      }
    }

    return NextResponse.json({
      success: true,
      isConfigured: true,
      data: {
        inventory: dbInventory,
        productionOrders: dbProduction,
        projectFiles: dbProjectFiles,
        salesOrders: dbSales,
        customers: dbCustomers,
        collaborators: finalCollaborators,
        purchaseOrders: dbPurchaseOrders,
        financialTransactions: dbFinancialTransactions,
        systemParameters: finalSystemParameters,
        commissionPayouts: dbCommissionPayouts,
      },
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });
  } catch (error: any) {
    console.error("Database connection/query error:", error);
    const isMigrationError = error?.message?.includes("MIGRATION_REQUIRED");
    const databaseUrl = process.env.DATABASE_URL || "";
    return NextResponse.json(
      {
        success: false,
        error: enhanceDatabaseError(error, databaseUrl),
        isConfigured: true,
        migrationRequired: isMigrationError,
        sql: isMigrationError ? MIGRATION_SQL : undefined,
      },
      { 
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate"
        }
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "DATABASE_URL environment variable is not defined. Please add it to your environment variables.",
          isConfigured: false,
        },
        { status: 200 }
      );
    }

    const isValidUrl = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
    if (!isValidUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "A variável DATABASE_URL está configurada com um formato inválido (deve começar com postgres:// ou postgresql://). Certifique-se de que copiou a Connection String de banco do Supabase, e não a API key.",
          isConfigured: false,
        },
        { status: 200 }
      );
    }

    const body = await req.json();
    const { inventory, productionOrders, salesOrders, customers, collaborators, purchaseOrders, financialTransactions, commissionPayouts, deleted } = body;

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: "DATABASE_URL environment variable is not defined or invalid.",
          isConfigured: false,
        },
        { status: 200 }
      );
    }
    
    // Ensure tables exist before running transaction
    await ensureTablesExist(db);

    // Perform database operations in a transaction to maintain integrity
    await db.transaction(async (tx: any) => {
      // 0. Handle Deletions if requested
      if (deleted) {
        if (Array.isArray(deleted.customers) && deleted.customers.length > 0) {
          await tx.delete(schema.customers).where(inArray(schema.customers.id, deleted.customers));
        }
        if (Array.isArray(deleted.inventory) && deleted.inventory.length > 0) {
          await tx.delete(schema.inventoryItems).where(inArray(schema.inventoryItems.sku, deleted.inventory));
        }
        if (Array.isArray(deleted.collaborators) && deleted.collaborators.length > 0) {
          await tx.delete(schema.collaborators).where(inArray(schema.collaborators.name, deleted.collaborators));
        }
        if (Array.isArray(deleted.purchaseOrders) && deleted.purchaseOrders.length > 0) {
          await tx.delete(schema.purchaseOrders).where(inArray(schema.purchaseOrders.id, deleted.purchaseOrders));
        }
        if (Array.isArray(deleted.financialTransactions) && deleted.financialTransactions.length > 0) {
          await tx.delete(schema.financialTransactions).where(inArray(schema.financialTransactions.id, deleted.financialTransactions));
        }
      }

      // 1. Sync Customers (Upsert)
      if (Array.isArray(customers) && customers.length > 0) {
        // Prepare database records
        const mappedCustomers = customers.map((c: any) => ({
          id: String(c.id || c.name),
          name: String(c.name || ""),
          document: String(c.cnpj || c.document || ""),
          email: String(c.email || ""),
          phone: String(c.phone || ""),
          address: String(c.address || ""),
          city: String(c.city || ""),
          state: String(c.state || ""),
          zip: String(c.zip || ""),
          segment: String(c.segment || "Industrial"),
          status: String(c.status || "Ativo"),
          creditBalance: Number(c.creditBalance ?? c.credit_balance ?? 0),
          creditHistory: Array.isArray(c.creditHistory) ? c.creditHistory : (Array.isArray(c.credit_history) ? c.credit_history : []),
          nickname: String(c.nickname || ""),
          updatedAt: c.updatedAt || new Date().toISOString(),
        }));

        await tx.insert(schema.customers)
          .values(mappedCustomers)
          .onConflictDoUpdate({
            target: schema.customers.id,
            set: {
              name: sql`excluded.name`,
              document: sql`excluded.document`,
              email: sql`excluded.email`,
              phone: sql`excluded.phone`,
              address: sql`excluded.address`,
              city: sql`excluded.city`,
              state: sql`excluded.state`,
              zip: sql`excluded.zip`,
              segment: sql`excluded.segment`,
              status: sql`excluded.status`,
              creditBalance: sql`excluded.credit_balance`,
              creditHistory: sql`excluded.credit_history::jsonb`,
              nickname: sql`excluded.nickname`,
              updatedAt: sql`excluded.updated_at`
            }
          });
      }

      // 2. Sync Inventory (Upsert)
      if (Array.isArray(inventory) && inventory.length > 0) {
        const mappedInventory = inventory.map((item: any) => ({
          sku: String(item.sku),
          name: String(item.name || ""),
          category: String(item.category || ""),
          qty: Number(item.stock ?? item.qty ?? 0),
          minQty: Number(item.minQty || 0),
          unit: String(item.unit || "UN"),
          location: String(item.location || "Galpão A"),
          price: Number(item.price ?? item.salesPrice ?? 0),
          status: (item.status === "Alerta" || item.status === "Crítico") ? item.status : "Disponível",
          imageUrl: item.image || item.imageUrl || null,
          weight: item.weight ? Number(item.weight) : null,
          lastUpdated: item.lastUpdated || new Date().toISOString().split("T")[0],
          stages: Array.isArray(item.stages) ? item.stages : [],
          updatedAt: item.updatedAt || new Date().toISOString(),
          active: item.active !== undefined ? Boolean(item.active) : true,
          operator: item.operator || null,
          purchasePrice: Number(item.purchasePrice ?? (item.price ? item.price * 0.45 : 0)),
          salesPrice: Number(item.salesPrice ?? item.price ?? 0),
        }));

        await tx.insert(schema.inventoryItems)
          .values(mappedInventory)
          .onConflictDoUpdate({
            target: schema.inventoryItems.sku,
            set: {
              name: sql`excluded.name`,
              category: sql`excluded.category`,
              qty: sql`excluded.qty`,
              minQty: sql`excluded.min_qty`,
              unit: sql`excluded.unit`,
              location: sql`excluded.location`,
              price: sql`excluded.price`,
              status: sql`excluded.status`,
              imageUrl: sql`excluded.image_url`,
              weight: sql`excluded.weight`,
              lastUpdated: sql`excluded.last_updated`,
              stages: sql`excluded.stages`,
              updatedAt: sql`excluded.updated_at`,
              active: sql`excluded.active`,
              operator: sql`excluded.operator`,
              purchasePrice: sql`excluded.purchase_price`,
              salesPrice: sql`excluded.sales_price`
            }
          });
      }

      // 3. Sync Sales Orders (Upsert)
      if (Array.isArray(salesOrders) && salesOrders.length > 0) {
        const mappedSales = salesOrders.map((so: any) => ({
          id: String(so.id),
          client: String(so.client || ""),
          clientSegment: so.clientSegment || so.client_segment || null,
          clientDocument: so.clientDocument || null,
          date: String(so.date || ""),
          deliveryDate: so.deliveryDate || null,
          items: String(so.items || ""),
          total: Number(so.value ?? so.total ?? 0),
          status: String(so.status || "Pendente"),
          paymentMethod: String(so.paymentMethod || "Boleto"),
          paymentStatus: String(so.paymentStatus || "Pendente"),
          operator: String(so.operator || "Operador"),
          lastOperator: so.lastOperator || null,
          notes: so.notes || null,
          products: Array.isArray(so.products) ? so.products : [],
          serialNumber: so.serialNumber ? Number(so.serialNumber) : 0,
          projectFiles: Array.isArray(so.projectFiles) ? so.projectFiles : (Array.isArray(so.project_files) ? so.project_files : []),
          projectImages: Array.isArray(so.projectImages) ? so.projectImages : (Array.isArray(so.project_images) ? so.project_images : []),
          boletoPaid: Boolean(so.boletoPaid ?? so.boleto_paid ?? false),
          boletoDueDate: so.boletoDueDate || so.boleto_due_date || null,
          paidAmount: Number(so.paidAmount ?? so.paid_amount ?? 0),
          boletoInstallments: Array.isArray(so.boletoInstallments) ? so.boletoInstallments : (Array.isArray(so.boleto_installments) ? so.boleto_installments : []),
          commissionPercentage: Number(so.commissionPercentage ?? so.commission_percentage ?? 0),
          commissionValue: Number(so.commissionValue ?? so.commission_value ?? 0),
          commissionPaid: Boolean(so.commissionPaid ?? so.commission_paid ?? false),
          commissionPayoutId: so.commissionPayoutId || so.commission_payout_id || null,
          updatedAt: so.updatedAt || new Date().toISOString(),
        }));

        await tx.insert(schema.salesOrders)
          .values(mappedSales)
          .onConflictDoUpdate({
            target: schema.salesOrders.id,
            set: {
              client: sql`excluded.client`,
              clientSegment: sql`excluded.client_segment`,
              clientDocument: sql`excluded.client_document`,
              date: sql`excluded.date`,
              deliveryDate: sql`excluded.delivery_date`,
              items: sql`excluded.items`,
              total: sql`excluded.total`,
              status: sql`excluded.status`,
              paymentMethod: sql`excluded.payment_method`,
              paymentStatus: sql`excluded.payment_status`,
              operator: sql`excluded.operator`,
              lastOperator: sql`excluded.last_operator`,
              notes: sql`excluded.notes`,
              products: sql`excluded.products`,
              serialNumber: sql`excluded.serial_number`,
              projectFiles: sql`excluded.project_files`,
              projectImages: sql`excluded.project_images`,
              boletoPaid: sql`excluded.boleto_paid`,
              boletoDueDate: sql`excluded.boleto_due_date`,
              paidAmount: sql`excluded.paid_amount`,
              boletoInstallments: sql`excluded.boleto_installments`,
              commissionPercentage: sql`excluded.commission_percentage`,
              commissionValue: sql`excluded.commission_value`,
              commissionPaid: sql`excluded.commission_paid`,
              commissionPayoutId: sql`excluded.commission_payout_id`,
              updatedAt: sql`excluded.updated_at`
            }
          });
      }

      // 4. Sync Production Orders (Upsert)
      if (Array.isArray(productionOrders) && productionOrders.length > 0) {
        const mappedProduction = productionOrders.map((op: any) => ({
          id: String(op.id),
          product: String(op.product || ""),
          qty: Number(op.qty || 1),
          line: String(op.line || "Linha A"),
          priority: String(op.priority || "Média"),
          status: String(op.status || "CAD"),
          supervisor: String(op.supervisor || ""),
          progress: Number(op.progress || 0),
          date: String(op.date || ""),
          files: Array.isArray(op.files) ? op.files : [],
          operator: op.operator || null,
          salesOrderId: op.salesOrderId || null,
          salesOrderClient: op.salesOrderClient || null,
          note: op.note || null,
          stageSupervisors: typeof op.stageSupervisors === 'object' && op.stageSupervisors !== null ? op.stageSupervisors : (typeof op.stage_supervisors === 'object' && op.stage_supervisors !== null ? op.stage_supervisors : {}),
          updatedAt: op.updatedAt || new Date().toISOString(),
        }));

        await tx.insert(schema.productionOrders)
          .values(mappedProduction)
          .onConflictDoUpdate({
            target: schema.productionOrders.id,
            set: {
              product: sql`excluded.product`,
              qty: sql`excluded.qty`,
              line: sql`excluded.line`,
              priority: sql`excluded.priority`,
              status: sql`excluded.status`,
              supervisor: sql`excluded.supervisor`,
              progress: sql`excluded.progress`,
              date: sql`excluded.date`,
              files: sql`excluded.files`,
              operator: sql`excluded.operator`,
              salesOrderId: sql`excluded.sales_order_id`,
              salesOrderClient: sql`excluded.sales_order_client`,
              note: sql`excluded.note`,
              stageSupervisors: sql`excluded.stage_supervisors`,
              updatedAt: sql`excluded.updated_at`
            }
          });
      }

      // 5. Sync Collaborators (Upsert)
      if (Array.isArray(collaborators) && collaborators.length > 0) {
        const mappedCollaborators = collaborators.map((u: any) => ({
          name: String(u.name),
          role: String(u.role || ""),
          status: ["Ativo", "Ausente", "Inativo"].includes(u.status) ? u.status : "Ativo",
          lastLogin: u.lastLogin || u.last_login || null,
          email: String(u.email || ""),
          permissions: u.permissions || {
            sales: { view: true, edit: false, del: false },
            inventory: { view: true, edit: false, del: false },
            production: { view: true, edit: false, del: false },
            customers: { view: true, edit: false, del: false },
            settings: { view: false, edit: false, del: false }
          },
          restrictToWorkHours: Boolean(u.restrictToWorkHours ?? u.restrict_to_work_hours ?? false),
          accessWindowStart: String(u.accessWindowStart || u.access_window_start || "08:00"),
          accessWindowEnd: String(u.accessWindowEnd || u.access_window_end || "18:00"),
          hideOrderValues: Boolean(u.hideOrderValues ?? u.hide_order_values ?? false),
          pin: String(u.pin ?? "1234"),
          allowedTabs: Array.isArray(u.allowedTabs || u.allowed_tabs) ? (u.allowedTabs || u.allowed_tabs) : [],
          commissionEligible: Boolean(u.commissionEligible ?? u.commission_eligible ?? false),
          commissionPercentage: Number(u.commissionPercentage ?? u.commission_percentage ?? 0),
          updatedAt: u.updatedAt || new Date().toISOString(),
        }));

        await tx.insert(schema.collaborators)
          .values(mappedCollaborators)
          .onConflictDoUpdate({
            target: schema.collaborators.name,
            set: {
              role: sql`excluded.role`,
              status: sql`excluded.status`,
              lastLogin: sql`excluded.last_login`,
              email: sql`excluded.email`,
              permissions: sql`excluded.permissions`,
              restrictToWorkHours: sql`excluded.restrict_to_work_hours`,
              accessWindowStart: sql`excluded.access_window_start`,
              accessWindowEnd: sql`excluded.access_window_end`,
              hideOrderValues: sql`excluded.hide_order_values`,
              pin: sql`excluded.pin`,
              allowedTabs: sql`excluded.allowed_tabs`,
              commissionEligible: sql`excluded.commission_eligible`,
              commissionPercentage: sql`excluded.commission_percentage`,
              updatedAt: sql`excluded.updated_at`
            }
          });
      }

      // 6. Sync Purchase Orders (Upsert)
      if (Array.isArray(purchaseOrders) && purchaseOrders.length > 0) {
        const mappedPurchaseOrders = purchaseOrders.map((o: any) => ({
          id: String(o.id),
          supplier: String(o.supplier || ""),
          value: Number(o.value || 0),
          status: String(o.status || "Rascunho"),
          date: String(o.date || ""),
          operator: o.operator || null,
          updatedAt: o.updatedAt || new Date().toISOString(),
        }));

        await tx.insert(schema.purchaseOrders)
          .values(mappedPurchaseOrders)
          .onConflictDoUpdate({
            target: schema.purchaseOrders.id,
            set: {
              supplier: sql`excluded.supplier`,
              value: sql`excluded.value`,
              status: sql`excluded.status`,
              date: sql`excluded.date`,
              operator: sql`excluded.operator`,
              updatedAt: sql`excluded.updated_at`
            }
          });
      }

      // 7. Sync Financial Transactions (Upsert)
      if (Array.isArray(financialTransactions) && financialTransactions.length > 0) {
        const mappedFinancialTransactions = financialTransactions.map((tx: any) => ({
          id: String(tx.id),
          description: String(tx.description || ""),
          type: String(tx.type || "DESPESA"),
          category: String(tx.category || ""),
          amount: Number(tx.amount || 0),
          dueDate: String(tx.dueDate || tx.due_date || ""),
          paymentDate: tx.paymentDate || tx.payment_date || null,
          status: String(tx.status || "PENDENTE"),
          clientOrSupplier: tx.clientOrSupplier || tx.client_or_supplier || null,
          paymentMethod: tx.paymentMethod || tx.payment_method || null,
          notes: tx.notes || null,
          salesOrderId: tx.salesOrderId || tx.sales_order_id || null,
          purchaseOrderId: tx.purchaseOrderId || tx.purchase_order_id || null,
          updatedAt: tx.updatedAt || new Date().toISOString(),
        }));

        await tx.insert(schema.financialTransactions)
          .values(mappedFinancialTransactions)
          .onConflictDoUpdate({
            target: schema.financialTransactions.id,
            set: {
              description: sql`excluded.description`,
              type: sql`excluded.type`,
              category: sql`excluded.category`,
              amount: sql`excluded.amount`,
              dueDate: sql`excluded.due_date`,
              paymentDate: sql`excluded.payment_date`,
              status: sql`excluded.status`,
              clientOrSupplier: sql`excluded.client_or_supplier`,
              paymentMethod: sql`excluded.payment_method`,
              notes: sql`excluded.notes`,
              salesOrderId: sql`excluded.sales_order_id`,
              purchaseOrderId: sql`excluded.purchase_order_id`,
              updatedAt: sql`excluded.updated_at`
            }
          });
      }

      // 8. Sync System Parameters (Upsert)
      const { systemParameters } = body;
      if (systemParameters && typeof systemParameters === 'object' && !Array.isArray(systemParameters)) {
        const p = systemParameters;
        const mappedSystemParameters = {
          id: 'system_config',
          companyName: String(p.companyName || p.company_name || 'Estilo Coifas'),
          companyCnpj: String(p.companyCnpj || p.company_cnpj || '12.345.678/0001-90'),
          companyEmail: String(p.companyEmail || p.company_email || 'comercial@estilocoifas.com.br'),
          companyPhone: String(p.companyPhone || p.company_phone || '(11) 4002-8922'),
          companyAddress: String(p.companyAddress || p.company_address || 'Rua Industrial, 1000 - São Paulo, SP'),
          companyLogo: String(p.companyLogo || p.company_logo || ''),
          defaultCurrency: String(p.defaultCurrency || p.default_currency || 'BRL'),
          targetProfitMargin: Number(p.targetProfitMargin || p.target_profit_margin || 20),
          defaultDeliveryLeadTime: Number(p.defaultDeliveryLeadTime || p.default_delivery_lead_time || 15),
          maxDiscountAllowed: Number(p.maxDiscountAllowed || p.max_discount_allowed || 10),
          alertRiskDays: Number(p.alertRiskDays || p.alert_risk_days || 3),
          enableDelayAlerts: Boolean(p.enableDelayAlerts !== undefined ? p.enableDelayAlerts : (p.enable_delay_alerts !== undefined ? p.enable_delay_alerts : true)),
          enableLowStockAlerts: Boolean(p.enableLowStockAlerts !== undefined ? p.enableLowStockAlerts : (p.enable_low_stock_alerts !== undefined ? p.enable_low_stock_alerts : true)),
          enableAutoBackup: Boolean(p.enableAutoBackup !== undefined ? p.enableAutoBackup : (p.enable_auto_backup !== undefined ? p.enable_auto_backup : false)),
          industrialSegments: Array.isArray(p.industrialSegments || p.industrial_segments) ? (p.industrialSegments || p.industrial_segments) : [],
          updatedAt: String(p.updatedAt || p.updated_at || new Date().toISOString()),
        };

        await tx.insert(schema.systemParameters)
          .values(mappedSystemParameters)
          .onConflictDoUpdate({
            target: schema.systemParameters.id,
            set: {
              companyName: sql`excluded.company_name`,
              companyCnpj: sql`excluded.company_cnpj`,
              companyEmail: sql`excluded.company_email`,
              companyPhone: sql`excluded.company_phone`,
              companyAddress: sql`excluded.company_address`,
              companyLogo: sql`excluded.company_logo`,
              defaultCurrency: sql`excluded.default_currency`,
              targetProfitMargin: sql`excluded.target_profit_margin`,
              defaultDeliveryLeadTime: sql`excluded.default_delivery_lead_time`,
              maxDiscountAllowed: sql`excluded.max_discount_allowed`,
              alertRiskDays: sql`excluded.alert_risk_days`,
              enableDelayAlerts: sql`excluded.enable_delay_alerts`,
              enableLowStockAlerts: sql`excluded.enable_low_stock_alerts`,
              enableAutoBackup: sql`excluded.enable_auto_backup`,
              industrialSegments: sql`excluded.industrial_segments`,
              updatedAt: sql`excluded.updated_at`
            }
          });
      }

      // 9. Sync Commission Payouts (Upsert)
      if (Array.isArray(commissionPayouts) && commissionPayouts.length > 0) {
        const mappedPayouts = commissionPayouts.map((cp: any) => ({
          id: String(cp.id),
          collaboratorName: String(cp.collaboratorName || cp.collaborator_name || ""),
          amount: Number(cp.amount || 0),
          percentage: Number(cp.percentage || 0),
          periodStart: String(cp.periodStart || cp.period_start || ""),
          periodEnd: String(cp.periodEnd || cp.period_end || ""),
          paymentDate: String(cp.paymentDate || cp.payment_date || ""),
          orderCount: Number(cp.orderCount || cp.order_count || 0),
          salesOrderIds: Array.isArray(cp.salesOrderIds) ? cp.salesOrderIds : (Array.isArray(cp.sales_order_ids) ? cp.sales_order_ids : []),
          financialTransactionId: cp.financialTransactionId || cp.financial_transaction_id || null,
          notes: cp.notes || null,
          updatedAt: cp.updatedAt || new Date().toISOString(),
        }));

        await tx.insert(schema.commissionPayouts)
          .values(mappedPayouts)
          .onConflictDoUpdate({
            target: schema.commissionPayouts.id,
            set: {
              collaboratorName: sql`excluded.collaborator_name`,
              amount: sql`excluded.amount`,
              percentage: sql`excluded.percentage`,
              periodStart: sql`excluded.period_start`,
              periodEnd: sql`excluded.period_end`,
              paymentDate: sql`excluded.payment_date`,
              orderCount: sql`excluded.order_count`,
              salesOrderIds: sql`excluded.sales_order_ids`,
              financialTransactionId: sql`excluded.financial_transaction_id`,
              notes: sql`excluded.notes`,
              updatedAt: sql`excluded.updated_at`
            }
          });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Dados sincronizados com sucesso no Supabase!",
    });
  } catch (error: any) {
    console.error("Database save transaction error:", error);
    const isMigrationError = error?.message?.includes("MIGRATION_REQUIRED");
    const databaseUrl = process.env.DATABASE_URL || "";
    return NextResponse.json(
      {
        success: false,
        error: enhanceDatabaseError(error, databaseUrl),
        migrationRequired: isMigrationError,
        sql: isMigrationError ? MIGRATION_SQL : undefined,
      },
      { status: 200 } // Return 200 so frontend can handle and display instructions beautifully
    );
  }
}
