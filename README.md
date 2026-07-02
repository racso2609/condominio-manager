# Condominio Gestión

Aplicación web para la gestión de condominios. Permite administrar edificios, unidades, residentes, gastos comunes, pagos, anuncios y métodos de pago.

## Características

- **Autenticación** con Firebase Authentication (Google).
- **Gestión de condominios**: crear, editar, completar registro y administrar edificios.
- **Gestión de edificios y unidades**: generación automática de unidades, selección múltiple, duplicación de edificios.
- **Residentes**: invitaciones individuales y grupales, reclamo de unidades, validación de propiedad y asignación manual por administradores.
- **Gastos comunes**: creación de gastos, generación de órdenes de pago por unidad.
- **Pagos**: reporte de pagos por residentes, validación por administradores, métodos de pago.
- **Anuncios**: publicación de anuncios con imágenes y documentos.
- **Dashboard de residentes**: visualización de deudas pendientes y pagos realizados.

## Tecnologías

- [Next.js](https://nextjs.org) 16
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) 4
- [Firebase](https://firebase.google.com) (Authentication, Firestore, Storage)

## Requisitos previos

- Node.js 20 o superior
- Cuenta de Firebase con un proyecto configurado

## Configuración

1. Clona el repositorio e instala las dependencias:

```bash
npm install
```

2. Crea un archivo `.env.local` en la raíz del proyecto con la configuración de Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

3. Configura Firebase Authentication con el proveedor de Google.

4. (Opcional) Configura Firestore Security Rules y Storage Rules según las necesidades del proyecto.

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

La aplicación puede desplegarse en cualquier plataforma que soporte Next.js, como [Vercel](https://vercel.com) o [Firebase App Hosting](https://firebase.google.com/docs/app-hosting).

## Estructura del proyecto

```
app/                    # Rutas y páginas de Next.js
components/             # Componentes reutilizables
lib/
  services/             # Funciones de acceso a Firebase
  types.ts              # Tipos de TypeScript
firebase.ts             # Configuración de Firebase
public/                 # Archivos estáticos
```

## Scripts disponibles

- `npm run dev` — Inicia el servidor de desarrollo.
- `npm run build` — Construye la aplicación para producción.
- `npm run start` — Inicia la aplicación en modo producción.
- `npm run lint` — Ejecuta ESLint.
