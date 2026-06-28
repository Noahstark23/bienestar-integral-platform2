# RAG e integración del proceso clínico

Este módulo dota a **Isabel** (la asistente IA) de conocimiento sobre el proceso
clínico del consultorio, sus protocolos y sus plantillas, y permite generar
documentos por paciente.

## Qué se agregó

### 1. Base de conocimiento (`server/knowledge/*.md`)
Documentos en español que describen:
- `01-proceso-clinico.md` — flujo completo del paciente nuevo (el flujograma).
- `02-estructura-expediente.md` — carpetas: perfil clínico, plan de intervención,
  registro de sesiones y sesiones de seguimiento.
- `03-protocolos-consultorio.md` — honorarios, duración, frecuencia,
  cancelaciones, deontología.
- `04`–`07` — plantillas: entrevista, historial clínico (anamnesis),
  consentimiento infantil y contrato de adultos.

Para ampliar el conocimiento de Isabel basta con **añadir o editar archivos
`.md`** en esa carpeta. El índice se reconstruye automáticamente al detectar
cambios (hash del contenido) o llamando a `POST /api/knowledge/reindex`.

### 2. Motor RAG (`server/lib/rag.js`)
- Trocea los `.md` por secciones (`##`).
- Genera *embeddings* con **Gemini `text-embedding-004`** y los guarda en un
  índice JSON en memoria (caché en `server/knowledge/.rag-index.json`).
- `retrieve(query, k)` ordena por similitud coseno.
- **Fallback por palabras clave** cuando no hay `GEMINI_API_KEY`: el sistema sigue
  funcionando, solo que sin búsqueda semántica.

### 3. Integración en Isabel (`server/routes/agent.js`)
- Antes de responder, recupera contexto relevante y lo inyecta (grounding).
- Nuevas herramientas (function calling):
  - `consultar_base_conocimiento` — busca en el proceso/plantillas/protocolos.
  - `generar_documento` — rellena una plantilla con los datos del paciente.
  - `actualizar_plan_clinico` — guarda perfil, plan, análisis de pruebas y fase.

### 4. Generación de documentos (`server/lib/documents.js`)
Rellena las plantillas con los datos del paciente: `contrato-adultos`,
`consentimiento-infantil`, `entrevista`, `historial-clinico`, `perfil-clinico`,
`plan-intervencion`. Disponible vía `GET /api/documents/patient/:id/:tipo` y desde
la pestaña **Documentos** del expediente (descarga PDF).

### 5. Modelo de datos (aditivo, vía `prisma db push`)
- `Patient.faseProceso` — fase del proceso clínico.
- `ClinicalRecord.analisisPruebas`, `perfilClinico`, `planIntervencion`.
- `Session.categoria` (`Registro` | `Seguimiento`), `objetivoTrabajado`, `tecnicas`.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET  | `/api/knowledge/status` | Estado del índice (modo semántico o keyword) |
| POST | `/api/knowledge/search` | Búsqueda semántica `{ query, k }` |
| POST | `/api/knowledge/reindex` | Reconstruye los embeddings |
| GET  | `/api/documents/types` | Tipos de documento disponibles |
| GET  | `/api/documents/patient/:id/:tipo` | Genera el documento del paciente |

Todos requieren autenticación (JWT).

## Configuración

- `GEMINI_API_KEY` activa la búsqueda **semántica** (recomendado). Sin ella, el
  RAG usa búsqueda por palabras clave.
- El índice se calienta al arrancar el servidor sin bloquear el inicio.
