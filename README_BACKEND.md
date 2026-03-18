# 🚀 Quick Start Guide - Backend Monolith

## ⚡ Inicio Rápido

### 1️⃣ Configurar API Key de Gemini (REQUERIDO)

Edita el archivo `.env` y reemplaza:

```env
GEMINI_API_KEY=your_api_key_here
```

Con tu API key real de: https://aistudio.google.com/app/apikey

---

### 2️⃣ Ejecutar en Modo Producción

```bash
npm start
```

Abre: **http://localhost:3000**

---

## 📋 Comandos Principales

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Frontend en modo desarrollo (puerto 5173) |
| `npm run server:dev` | Backend en modo desarrollo con nodemon |
| `npm run build` | Compilar frontend a `dist/` |
| `npm start` | Build + Ejecutar en producción (puerto 3000) |
| `node prisma/seed.js` | Re-sembrar base de datos |

---

## 🔥 Código Clave Entregado

### 1. Servidor Express - [`server/index.js`](file:///c:/bienestar-integral-platform2-main/server/index.js)

```javascript
// POST /api/chat - Chatbot con Gemini AI
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  const systemPrompt = getGeminiSystemPrompt();
  const fullPrompt = `${systemPrompt}\n\nUsuario: ${message}\n\nRespuesta:`;
  
  const result = await geminiModel.generateContent(fullPrompt);
  res.json({ reply: result.response.text() });
});

// GET /api/patients - Listar pacientes
app.get('/api/patients', async (req, res) => {
  const patients = await prisma.patient.findMany({
    include: { sessions: true }
  });
  res.json(patients);
});

// Catch-all para React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});
```

---

### 2. Schema Prisma - [`prisma/schema.prisma`](file:///c:/bienestar-integral-platform2-main/prisma/schema.prisma)

```prisma
model Patient {
  id        Int       @id @default(autoincrement())
  nombre    String
  edad      Int
  telefono  String
  motivo    String
  createdAt DateTime  @default(now())
  sessions  Session[]
}

model Session {
  id          Int      @id @default(autoincrement())
  patientId   Int
  fecha       DateTime
  notas       String
  pago        Float
  estadoPago  String
  patient     Patient  @relation(fields: [patientId], references: [id])
}
```

---

### 3. ChatWidget con API Real - [`components/ChatWidget.tsx`](file:///c:/bienestar-integral-platform2-main/components/ChatWidget.tsx)

```typescript
const handleSend = async () => {
  // Mostrar "typing..."
  setMessages(prev => [...prev, typingMsg]);

  // Llamada a la API
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMsg.text })
  });

  const data = await response.json();
  
  // Mostrar respuesta
  setMessages(prev => {
    const filtered = prev.filter(m => m.id !== 'typing');
    return [...filtered, { text: data.reply, sender: 'bot' }];
  });
};
```

---

### 4. AdminDashboard con useEffect - [`components/AdminDashboard.tsx`](file:///c:/bienestar-integral-platform2-main/components/AdminDashboard.tsx)

```typescript
useEffect(() => {
  const fetchData = async () => {
    const [patientsRes, sessionsRes, expensesRes] = await Promise.all([
      fetch('/api/patients'),
      fetch('/api/sessions'),
      fetch('/api/expenses')
    ]);

    setPatients(await patientsRes.json());
    setSessions(await sessionsRes.json());
    setExpenses(await expensesRes.json());
  };

  fetchData();
}, []);
```

---

## 🧪 Pruebas con cURL

### Chatbot
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"¿Cuánto cuesta una consulta?"}'
```

### Crear Paciente
```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test User","edad":30,"telefono":"8888-8888","motivo":"Consulta"}'
```

---

## 🎯 Endpoints API Disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/chat` | Chatbot con Gemini AI |
| GET | `/api/patients` | Listar pacientes (incluye sesiones) |
| POST | `/api/patients` | Crear nuevo paciente |
| GET | `/api/sessions` | Listar sesiones |
| GET | `/api/expenses` | Listar gastos |

---

## ✨ Resultado Final

✅ **Monolito completo** - Frontend + Backend en un solo servidor  
✅ **Base de datos** - SQLite con Prisma ORM  
✅ **Chatbot IA** - Google Gemini Flash (Free Tier)  
✅ **API REST** - 5 endpoints funcionales  
✅ **Frontend reactivo** - Carga datos en tiempo real  
✅ **Seed data** - 3 pacientes, 5 sesiones, 4 gastos  

**Listo para producción** 🚀
