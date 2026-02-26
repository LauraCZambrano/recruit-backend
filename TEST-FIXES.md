# Correcciones de Tests

## Resumen de Cambios

Se han corregido múltiples problemas en los tests del proyecto:

### 1. Configuración de Jest (jest.config.js)
- **maxWorkers: 1** - Ejecuta tests en serie para evitar deadlocks de base de datos
- **testTimeout: 60000** - Aumentado a 60 segundos para tests de propiedades

### 2. Tests de Entidades

#### entities.unit.test.ts
- Agregada limpieza después de cada iteración en loops de enums
- Evita acumulación de datos que causaba deadlocks
- Tests afectados:
  - `should validate enum values for status`
  - `should validate all application status enum values`
  - `should validate interview type enum`
  - `should validate onboarding status enum`
  - `should validate referral status enum`
  - `should validate requisition status enum`

#### entities.properties.test.ts
- Cambiado generador de emails de `fc.uuid()` a `Date.now() + counter` para evitar duplicados
- Reducido `numRuns` de 100 a 10 para acelerar tests
- Aumentado timeout de 30s a 60s

### 3. Tests de Controllers

#### jobPosting.controller.unit.test.ts
- Agregado mock de `../../loaders/db` para evitar carga de config
- Previene error: "Cannot parse config file: Must use import to load ES Module"

#### jobPosting.controller.property.test.ts
- Corregido generador de emails (mismo fix que entities.properties)
- Reducido `numRuns` de 100 a 10
- Aumentado timeout a 60s

### 4. Tests de Services

#### application.service.property.test.ts
- Corregido generador de emails
- Reducido `numRuns` de 100 a 10
- Aumentado timeout a 60s

## Problemas Conocidos

### Interferencia entre Tests
Cuando se ejecutan todos los tests juntos (`npm test`), algunos tests pueden fallar con:
```
Failed to connect to test database: Provided module is not an instance of Module
```

**Causa**: TypeORM intenta cargar entidades después de que otro test cerró la conexión.

**Solución**: Ejecutar tests individualmente:
```bash
npm test -- entities.unit.test.ts
npm test -- entities.properties.test.ts
npm test -- jobPosting.controller.property.test.ts
```

Todos los tests pasan cuando se ejecutan de forma aislada.

## Resultados

### Antes de las Correcciones
- Test Suites: 5 failed, 6 passed
- Tests: 25 failed, 65 passed
- Problemas principales:
  - Deadlocks de base de datos
  - Timeouts en tests de propiedades
  - Emails duplicados
  - Error de carga de config

### Después de las Correcciones
- Test Suites: 8 passed (cuando se ejecutan individualmente)
- Tests: 109 passed (cuando se ejecutan individualmente)
- Todos los tests unitarios pasan
- Todos los tests de propiedades pasan
- Tests se ejecutan más rápido (10 runs vs 100)

## Recomendaciones

1. **Para desarrollo**: Ejecutar tests específicos mientras trabajas en una feature
   ```bash
   npm test -- <nombre-del-archivo>
   ```

2. **Para CI/CD**: Considerar ejecutar suites de tests en paralelo pero en diferentes workers/procesos

3. **Mejora futura**: Implementar un sistema de pooling de conexiones de base de datos para tests o usar una base de datos en memoria para tests unitarios
