-- CreateTable
CREATE TABLE "Patient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "edad" INTEGER NOT NULL,
    "telefono" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "fechaNacimiento" DATETIME,
    "ocupacion" TEXT NOT NULL DEFAULT '',
    "escolaridad" TEXT NOT NULL DEFAULT '',
    "estadoCivil" TEXT NOT NULL DEFAULT '',
    "tutorNombre" TEXT,
    "tutorRelacion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "fechaAlta" DATETIME,
    "motivoAlta" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClinicalRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "antecedentesMedicos" TEXT NOT NULL DEFAULT '',
    "antecedentesFamiliares" TEXT NOT NULL DEFAULT '',
    "historiaDesarrollo" TEXT NOT NULL DEFAULT '',
    "diagnostico" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClinicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "patientName" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "pago" REAL NOT NULL,
    "estadoPago" TEXT NOT NULL DEFAULT 'Pendiente',
    "tipo" TEXT NOT NULL DEFAULT 'Terapia',
    "notaSubjetiva" TEXT NOT NULL DEFAULT '',
    "notaObjetiva" TEXT NOT NULL DEFAULT '',
    "notaAnalisis" TEXT NOT NULL DEFAULT '',
    "notaPlan" TEXT NOT NULL DEFAULT '',
    "resumen" TEXT NOT NULL DEFAULT '',
    "facturada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TherapeuticGoal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "progreso" INTEGER NOT NULL DEFAULT 0,
    "fechaInicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaLimite" DATETIME,
    "fechaLogro" DATETIME,
    "notas" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "TherapeuticGoal_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'Operativo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombrePaciente" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "fechaHora" DATETIME NOT NULL,
    "motivo" TEXT NOT NULL DEFAULT '',
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroFactura" TEXT NOT NULL,
    "patientId" INTEGER NOT NULL,
    "subtotal" REAL NOT NULL,
    "descuento" REAL NOT NULL DEFAULT 0,
    "iva" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "pagado" REAL NOT NULL DEFAULT 0,
    "saldo" REAL NOT NULL,
    "fechaEmision" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "notas" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoiceId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "monto" REAL NOT NULL,
    CONSTRAINT "InvoiceSession_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoiceId" INTEGER NOT NULL,
    "monto" REAL NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "referencia" TEXT NOT NULL DEFAULT '',
    "fechaPago" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPor" TEXT NOT NULL DEFAULT 'Sistema',
    "notas" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalRecord_patientId_key" ON "ClinicalRecord"("patientId");

-- CreateIndex
CREATE INDEX "Session_patientId_idx" ON "Session"("patientId");

-- CreateIndex
CREATE INDEX "Session_fecha_idx" ON "Session"("fecha");

-- CreateIndex
CREATE INDEX "TherapeuticGoal_patientId_idx" ON "TherapeuticGoal"("patientId");

-- CreateIndex
CREATE INDEX "TherapeuticGoal_estado_idx" ON "TherapeuticGoal"("estado");

-- CreateIndex
CREATE INDEX "Expense_fecha_idx" ON "Expense"("fecha");

-- CreateIndex
CREATE INDEX "Appointment_fechaHora_idx" ON "Appointment"("fechaHora");

-- CreateIndex
CREATE INDEX "Appointment_estado_idx" ON "Appointment"("estado");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_dayOfWeek_idx" ON "AvailabilitySlot"("dayOfWeek");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_isActive_idx" ON "AvailabilitySlot"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_numeroFactura_key" ON "Invoice"("numeroFactura");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSession_invoiceId_sessionId_key" ON "InvoiceSession"("invoiceId", "sessionId");
