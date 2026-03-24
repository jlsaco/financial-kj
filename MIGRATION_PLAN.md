# Plan: Migrar persistencia de localStorage a Supabase

## Context

FinanceKJ es una app personal de finanzas (Next.js 16 + React 19 + TypeScript) que persiste datos en `localStorage` del navegador. Se quiere migrar a Supabase para tener persistencia en la nube. No se requiere autenticación, ni RLS, ni fallback a localStorage. Tablas vacías (sin migrar datos existentes).

## Decisiones del usuario
- Sin autenticación (mantener usuarios hardcodeados: jose, karen, bot-correos)
- 100% Supabase (sin fallback localStorage)
- Sin Row Level Security
- Tablas vacías (sin migración de datos existentes)

---

## Fase 1: Infraestructura Supabase

### 1.1 Crear tablas via migración (`mcp__supabase__apply_migration`)

SQL migration `001_create_tables`:

```sql
CREATE TYPE record_type AS ENUM ('gasto', 'ingreso');
CREATE TYPE category AS ENUM (
  'movilidad', 'alimentacion-salud', 'hogar-entretenimiento', 'deuda', 'servicios'
);
CREATE TYPE user_id AS ENUM ('jose', 'karen', 'bot-correos');

CREATE TABLE finance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type record_type NOT NULL,
  category category NOT NULL,
  user_id user_id NOT NULL,
  date DATE NOT NULL,
  recurring_event_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recurring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category category NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  default_amount NUMERIC(12,2) NOT NULL CHECK (default_amount > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_id user_id NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE month_payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_event_id UUID NOT NULL REFERENCES recurring_events(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_date TIMESTAMPTZ,
  record_id UUID REFERENCES finance_records(id) ON DELETE SET NULL,
  note TEXT,
  UNIQUE (recurring_event_id, month, year)
);

CREATE TABLE category_budgets (
  category category PRIMARY KEY,
  monthly_budget NUMERIC(12,2) NOT NULL CHECK (monthly_budget >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE finance_records
  ADD CONSTRAINT fk_finance_records_recurring_event
  FOREIGN KEY (recurring_event_id) REFERENCES recurring_events(id) ON DELETE SET NULL;

CREATE INDEX idx_finance_records_date ON finance_records(date);
CREATE INDEX idx_finance_records_user_id ON finance_records(user_id);
CREATE INDEX idx_month_payment_configs_recurring ON month_payment_configs(recurring_event_id);

INSERT INTO category_budgets (category, monthly_budget) VALUES
  ('movilidad', 300000),
  ('alimentacion-salud', 800000),
  ('hogar-entretenimiento', 500000),
  ('deuda', 1000000),
  ('servicios', 400000);
```

Notas del schema:
- `ON DELETE CASCADE` en `month_payment_configs.recurring_event_id` replica el comportamiento actual del reducer (línea 107-109 de finance-context.tsx)
- `ON DELETE SET NULL` en `finance_records.recurring_event_id` preserva registros si se borra el evento recurrente
- `UNIQUE(recurring_event_id, month, year)` habilita upsert nativo para `SET_MONTH_CONFIG`
- `NUMERIC(12,2)` para montos evita problemas de punto flotante
- Budgets se seedean en la migración

### 1.2 Verificar tablas
- `mcp__supabase__list_tables` para confirmar las 4 tablas
- `mcp__supabase__execute_sql`: `SELECT * FROM category_budgets` (debe tener 5 filas)

### 1.3 Obtener credenciales
- `mcp__supabase__get_project_url` y `mcp__supabase__get_publishable_keys`

---

## Fase 2: Setup del cliente

### 2.1 Instalar dependencia
```bash
npm install @supabase/supabase-js
```

### 2.2 Crear `.env.example` (nuevo archivo)
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2.3 Actualizar `.gitignore`
Agregar `!.env.example` después de `.env*` para que `.env.example` sí se versione.

### 2.4 Crear `.env.local` con valores reales (ya está en .gitignore)

### 2.5 Crear `src/lib/supabase.ts` (nuevo archivo)
Cliente singleton de Supabase con `createClient()`.

### 2.6 Generar tipos TypeScript
Usar `mcp__supabase__generate_typescript_types` → guardar en `src/types/database.ts`

---

## Fase 3: Reescribir capa de Store

Cambio fundamental: de "leer/guardar array completo" a **operaciones CRUD granulares async**.

### 3.1 Reescribir `src/store/records-store.ts`
- `fetchRecords(): Promise<FinanceRecord[]>` — SELECT all, ORDER BY date DESC
- `insertRecord(data): Promise<FinanceRecord>` — INSERT RETURNING * (DB genera UUID)
- `updateRecord(id, updates): Promise<FinanceRecord>` — UPDATE WHERE id RETURNING *
- `deleteRecord(id): Promise<void>` — DELETE WHERE id

Cada función incluye mapper snake_case → camelCase. Nota: `NUMERIC` viene como string de Supabase, usar `Number()`.

### 3.2 Reescribir `src/store/recurring-store.ts`
Mismo patrón para RecurringEvent + MonthPaymentConfig.
- `upsertMonthConfig(config)` usa `.upsert()` de Supabase (por el UNIQUE constraint)

### 3.3 Reescribir `src/store/budgets-store.ts`
- `fetchBudgets(): Promise<CategoryBudget[]>` — SELECT all
- `updateBudget(budget): Promise<CategoryBudget>` — UPDATE WHERE category

### 3.4 Eliminar `src/store/storage.ts`
Ya no se necesita el wrapper de localStorage.

---

## Fase 4: Refactorizar Finance Context

**Archivo**: `src/contexts/finance-context.tsx`

### 4.1 Cambio de arquitectura
- **Mantener** el reducer para manejo de estado local
- **Eliminar** los 4 useEffect de persistencia (líneas 173-191)
- **Reemplazar** `dispatch` expuesto con **funciones async** que: (1) llaman a Supabase, (2) en éxito dispatcha al reducer, (3) en error muestra toast

### 4.2 Nueva interfaz del contexto
```typescript
interface FinanceContextValue {
  state: FinanceState;
  addRecord: (data: Omit<FinanceRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateRecord: (id: string, updates: Partial<FinanceRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  addRecurringEvent: (data: Omit<RecurringEvent, 'id' | 'createdAt'>) => Promise<void>;
  updateRecurringEvent: (id: string, updates: Partial<RecurringEvent>) => Promise<void>;
  deleteRecurringEvent: (id: string) => Promise<void>;
  setMonthConfig: (config: Omit<MonthPaymentConfig, 'id'>) => Promise<void>;
  updateBudget: (budget: CategoryBudget) => Promise<void>;
  getMonthSummary: (month: number, year: number) => { ... };
  getUpcomingEvents: () => UpcomingEvent[];
}
```

### 4.3 Init async
```typescript
useEffect(() => {
  async function load() {
    const [records, recurringEvents, monthConfigs, budgets] = await Promise.all([
      recordsStore.fetchRecords(),
      recurringStore.fetchRecurringEvents(),
      recurringStore.fetchMonthConfigs(),
      budgetsStore.fetchBudgets(),
    ]);
    dispatch({ type: "INIT", payload: { records, recurringEvents, monthConfigs, budgets } });
  }
  load().catch(() => toast.error("Error cargando datos"));
}, []);
```

### 4.4 Patrón de cada acción
```typescript
const addRecord = useCallback(async (data) => {
  const saved = await recordsStore.insertRecord(data);
  dispatch({ type: "ADD_RECORD", payload: saved });
}, []);
```

Estrategia **server-first**: la UI solo se actualiza después de que Supabase confirma. Sin optimistic updates (simplifica el código, latencia aceptable para app personal).

---

## Fase 5: Actualizar componentes consumidores

Cambio: `dispatch({ type: "ADD_RECORD", payload })` → `await addRecord(data)`

### Archivos a modificar (los que usan dispatch):
| Archivo | Acciones |
|---------|----------|
| `src/components/records/record-form-drawer.tsx` | ADD_RECORD, UPDATE_RECORD |
| `src/components/recurring/recurring-form-drawer.tsx` | ADD_RECURRING, UPDATE_RECURRING |
| `src/components/recurring/recurring-card.tsx` | UPDATE_RECURRING (toggle) |
| `src/components/recurring/payment-timeline.tsx` | SET_MONTH_CONFIG |
| `src/components/budgets/budget-edit-drawer.tsx` | UPDATE_BUDGET |
| `src/app/page.tsx` | DELETE_RECORD |
| `src/app/registros/page.tsx` | DELETE_RECORD |
| `src/app/recurrentes/[id]/page.tsx` | DELETE_RECURRING |

### Componentes sin cambios (solo leen state):
- `src/components/dashboard/budget-overview.tsx`
- `src/components/dashboard/summary-card.tsx`
- `src/components/dashboard/upcoming-events.tsx`
- `src/app/presupuestos/page.tsx`
- `src/app/recurrentes/page.tsx`

### Patrón de transformación en cada componente:
```typescript
// Antes:
dispatch({ type: "ADD_RECORD", payload: record });
toast.success("Registro creado");

// Después:
try {
  await addRecord(recordData);
  toast.success("Registro creado");
} catch {
  toast.error("Error al guardar");
}
```

Los handlers pasan a ser `async`. Ya no generan UUID en cliente (lo genera el DB).

---

## Fase 6: Cleanup

- Eliminar `src/store/storage.ts`
- Eliminar `STORAGE_KEYS` de `src/lib/constants.ts`
- Eliminar `DEFAULT_BUDGETS` de `src/lib/constants.ts` (seedeados en DB)

---

## Verificación

1. **Tablas**: `mcp__supabase__list_tables` + queries de verificación
2. **CRUD via MCP**: Insertar y borrar un registro de prueba con `execute_sql`
3. **App local**: `npm run dev` y probar:
   - Carga inicial sin errores
   - Crear registro → aparece en UI y en DB
   - Editar registro → persiste
   - Borrar registro → desaparece
   - Crear evento recurrente, marcar como pagado
   - Actualizar presupuesto
   - Refrescar página → datos persisten
4. **Build**: `npm run build` sin errores

---

## Resumen de archivos

| Acción | Archivo |
|--------|---------|
| **Crear** | `.env.example`, `.env.local`, `src/lib/supabase.ts`, `src/types/database.ts` |
| **Reescribir** | `src/store/records-store.ts`, `src/store/recurring-store.ts`, `src/store/budgets-store.ts` |
| **Refactorizar** | `src/contexts/finance-context.tsx` |
| **Modificar** | `.gitignore`, `src/lib/constants.ts`, 8 componentes consumidores |
| **Eliminar** | `src/store/storage.ts` |
