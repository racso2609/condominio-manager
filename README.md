# Condominio Gestión

Aplicación web para la gestión de condominios. Permite administrar edificios, unidades, residentes, gastos comunes, pagos, anuncios, quejas y métodos de pago.

## Características

- **Autenticación** con Supabase Auth (Google OAuth).
- **Gestión de condominios**: crear, editar, completar registro y administrar edificios.
- **Gestión de edificios y unidades**: generación automática de unidades, selección múltiple, duplicación de edificios.
- **Residentes**: invitaciones individuales y grupales, reclamo de unidades, validación de propiedad y asignación manual por administradores.
- **Gastos comunes**: creación de gastos, generación de órdenes de pago por unidad.
- **Pagos**: reporte de pagos por residentes, validación por administradores, métodos de pago.
- **Anuncios**: publicación de anuncios con imágenes y documentos.
- **Quejas**: registro de quejas por residentes con imágenes y documentos; administradores pueden gestionar estados (pendiente, en progreso, resuelta).
- **Dashboard de residentes**: visualización de deudas pendientes y pagos realizados.

## Tecnologías

- [Next.js](https://nextjs.org) 16
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) 4
- [Supabase](https://supabase.com) (Auth, PostgreSQL, Storage)

## Requisitos previos

- Node.js 20 o superior
- Cuenta de Supabase con un proyecto configurado

## Configuración

1. Clona el repositorio e instala las dependencias:

```bash
npm install
```

2. Crea un archivo `.env.local` en la raíz del proyecto con la configuración de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

3. Configura Supabase Auth con el proveedor de Google.

4. (Opcional) Configura Row Level Security (RLS) y Storage Policies según las necesidades del proyecto.

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Construir para producción

```bash
npm run build
```

## Despliegue

La aplicación puede desplegarse en cualquier plataforma que soporte Next.js, como [Vercel](https://vercel.com).

## Estructura del proyecto

```
app/                    # Rutas y páginas de Next.js
components/             # Componentes reutilizables
  lib/
  services/             # Funciones de acceso a Supabase
  types.ts              # Tipos de TypeScript
supabase.ts             # Configuración de Supabase
public/                 # Archivos estáticos
```

## Scripts disponibles

- `npm run dev` — Inicia el servidor de desarrollo.
- `npm run build` — Construye la aplicación para producción.
- `npm run start` — Inicia la aplicación en modo producción.
- `npm run lint` — Ejecuta ESLint.
