# DaCodes Recruit - AI-Powered Recruitment Platform

Plataforma de reclutamiento que automatiza la detección de talento, screening de candidatos, evaluaciones, y onboarding con IA, reduciendo tiempo de contratación de 60+ días a <30 días.

## Visión del Producto

DaCodes Recruit es una plataforma backend de gestión de reclutamiento construida con Node.js y TypeScript que proporciona una API RESTful para automatizar procesos de contratación, incluyendo:

- Gestión de candidatos y aplicaciones
- Publicación y seguimiento de vacantes
- Screening automatizado de CVs con IA (Google Gemini)
- Evaluaciones y entrevistas
- Onboarding de nuevos empleados
- Sistema de referidos y talent pools

## Mercado Target

El mercado de recruiting software crece 15%+ anualmente, valuado en $3 mil millones USD. El costo de contratación promedio es $4,000-10,000 USD.

**DaCodes Recruit apunta a:**
- Empresas medianas (50-500 empleados) con rotación, crecimiento, o problemas de reclutamiento
- Industrias: Tecnología, Servicios Profesionales, Manufactura, Retail, Finanzas
- Buyer Personas: HR Managers, Recruiters, Hiring Managers, CEOs
- Geografía: México, Latinoamérica, España
- Presupuesto: $250-1,500 USD/mes según tamaño

## Tecnologías Utilizadas

### Runtime & Lenguaje
- **Node.js** con **TypeScript 5.9.3**
- Módulos ESM
- Target: esnext

### Framework & Librerías Core
- **Express 5.2.1** - Framework web
- **TypeORM 0.3.28** - ORM para PostgreSQL
- **PostgreSQL** - Base de datos principal
- **Zod 4.3.6** - Validación de schemas
- **Pino 10.3.1** - Logging estructurado
- **config 4.4.0** - Gestión de configuración
- **jsonwebtoken 9.0.3** - Autenticación JWT
- **Google Gemini AI** - Análisis de CVs con IA

### Herramientas de Desarrollo
- **tsx 4.21.0** - Ejecución de TypeScript en modo watch
- **Jest 30.2.0** - Testing
- **Prettier 3.8.1** - Formateo de código
- **morgan 1.10.1** - Logger HTTP (desarrollo)

## Arquitectura

El proyecto sigue una arquitectura en capas con clara separación de responsabilidades:

```
Routes → Controllers → Services → Models
```

- **Routes**: Definición de endpoints y validación con Zod
- **Controllers**: Manejo de peticiones HTTP
- **Services**: Lógica de negocio
- **Models**: Entidades TypeORM

### Patrón de Loaders
La inicialización de la aplicación se divide en loaders que se ejecutan secuencialmente:
1. Database loader - Inicializa TypeORM DataSource
2. Express loader - Configura middleware y rutas

## Requisitos Previos

- Node.js (v18 o superior)
- PostgreSQL (v14 o superior)
- npm o yarn

## Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd recruit-backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

4. Editar el archivo `.env` con tus configuraciones:
```env
NODE_ENV=development
PORT=8000
ORIGIN=http://localhost:3000
API_PREFIX=/api

# Base de datos PostgreSQL
DB_TYPE=postgres
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=recruit_db
DB_PORT=5432
DB_HOST=localhost

# JWT (genera tus propias claves RSA)
JWT_PUBLIC=tu_clave_publica
JWT_PRIVATE=tu_clave_privada
JWT_ALGO=RS256
JWT_EXPIRES=1

# Google Gemini AI (obtén tu API key en https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=tu_api_key
```

5. Crear la base de datos en PostgreSQL:
```bash
createdb recruit_db
```

6. Ejecutar migraciones:
```bash
npm run migration:run
```

## Uso

### Desarrollo (modo watch)
```bash
npm run dev
```

El servidor se iniciará en `http://localhost:8000` (o el puerto configurado en `.env`)

### Testing
```bash
# Ejecutar tests
npm test

# Modo watch
npm run test:watch

# Con cobertura
npm run test:coverage
```

### Formateo de código
```bash
npm run format
```

### Migraciones de Base de Datos
```bash
# Generar nueva migración
npm run migration:generate -- src/migrations/NombreMigracion

# Ejecutar migraciones pendientes
npm run migration:run

# Revertir última migración
npm run migration:revert
```

## Estructura del Proyecto

```
recruit-backend/
├── config/                    # Configuración por ambiente
├── src/
│   ├── api/                  # Capa API
│   │   ├── middlewares/      # Middlewares Express
│   │   └── routes/           # Definición de rutas
│   ├── controllers/          # Controladores HTTP
│   ├── services/             # Lógica de negocio
│   ├── models/               # Entidades TypeORM
│   ├── schemas/              # Schemas de validación Zod
│   ├── loaders/              # Inicialización de la app
│   ├── migrations/           # Migraciones de base de datos
│   ├── types/                # Definiciones TypeScript
│   └── utils/                # Utilidades
├── .env                      # Variables de entorno (no versionado)
├── .env.example              # Template de variables
└── package.json
```

## API Endpoints

La API está prefijada con `/api` (configurable via `API_PREFIX`):

- `GET /status` - Health check
- `POST /api/auth/*` - Autenticación
- `GET/POST /api/job-postings` - Gestión de vacantes
- `GET/POST /api/applications` - Gestión de aplicaciones
- `POST /api/ai/screen-cv` - Screening de CVs con IA
- Y más...

## Convenciones de Código

- Usar imports relativos (../ o ./) - NO usar alias @/*
- NO incluir extensiones de archivo en imports
- Archivos de entidades: `*.entity.ts`
- Sistema de módulos: ESM (import/export)
- Respuestas de error: `{ success, message, error }`

## Licencia

MIT

## Autor

DaCodes
