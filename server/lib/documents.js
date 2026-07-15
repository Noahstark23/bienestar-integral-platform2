// ============================================================
// Generación de documentos clínicos
// Rellena las plantillas del consultorio con los datos del paciente.
// Módulo puro (sin acceso a base de datos): recibe el objeto paciente ya
// cargado y devuelve una estructura lista para renderizar a PDF o texto.
// ============================================================

export const PROFESIONAL = {
    nombre: 'Lic. Esmirna Isabel García Hernández',
    profesion: 'Licenciada en Psicología',
    codigoMinsa: '89952',
    celular: '87171412',
    consultorio: 'Consultorio Psicológico Bienestar Integral',
};

export const HONORARIOS = {
    adultos: '20 dólares (USD)',
    infantil: '700 córdobas',
};

// Tipos de documento disponibles
export const DOCUMENT_TYPES = [
    { tipo: 'contrato-adultos', titulo: 'Contrato Terapéutico (Adultos)' },
    { tipo: 'consentimiento-infantil', titulo: 'Asentimiento Informado (Psicoterapia Infantil)' },
    { tipo: 'entrevista', titulo: 'Entrevista Psicológica' },
    { tipo: 'historial-clinico', titulo: 'Historial Clínico (Anamnesis)' },
    { tipo: 'perfil-clinico', titulo: 'Perfil Clínico' },
    { tipo: 'plan-intervencion', titulo: 'Plan de Intervención' },
];

const BLANK = '_______________________';

function fechaLarga(d = new Date()) {
    try {
        return new Date(d).toLocaleDateString('es-NI', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return new Date().toLocaleDateString('es-NI');
    }
}

function val(v, fallback = BLANK) {
    if (v === null || v === undefined || v === '') return fallback;
    return String(v);
}

// ─── Documentos ──────────────────────────────────────────────

function contratoAdultos(p) {
    return {
        secciones: [
            { heading: '', lines: [
                `${PROFESIONAL.consultorio}`,
                `Profesional: ${PROFESIONAL.nombre} — Cód. MINSA: ${PROFESIONAL.codigoMinsa}`,
            ]},
            { heading: 'Finalidad', lines: [
                'La finalidad del presente contrato es especificar las condiciones generales del funcionamiento del programa psicoterapéutico que Ud. va a comenzar. En él se detallan, además, una serie de compromisos que deben ser respetados por las partes implicadas para su adecuado desarrollo.',
            ]},
            { heading: 'Condiciones de funcionamiento y compromisos del psicólogo', lines: [
                '1. El psicólogo se compromete a velar por la adecuación científica y profesional de los programas de tratamiento que se realicen.',
                '2. El programa de intervención respetará el Código Deontológico de la profesión (Colegio Oficial de Psicólogos), incluida la confidencialidad de los datos obtenidos.',
                '3. Las sesiones se realizarán con una periodicidad de una sesión semanal de aproximadamente 55 minutos de duración. En ocasiones pueden realizarse dos sesiones semanales si lo justifican necesidades concretas de la intervención.',
                '4. Si la dificultad del problema clínico requiere un recurso diferente, el psicólogo se compromete —si el paciente así lo desea— a informarle sobre otros profesionales que se ajusten más a sus características particulares.',
            ]},
            { heading: 'Compromiso del paciente', lines: [
                '1. Asistir de forma regular y puntual a las sesiones. Si no asiste a dos sesiones consecutivas sin informar, el tratamiento se dará por terminado.',
                '2. Asistir en el día y horario acordado, con tolerancia de 15 minutos de retraso.',
                '3. Los honorarios correspondientes a cada sesión serán de 20 dólares.',
                '4. Realizar las tareas clínicas y trabajos personales indicados por la terapeuta.',
                '5. Cuando sea necesario por indicación de la terapeuta y previo acuerdo, facilitar el contacto con un familiar o persona allegada para mejorar la eficacia de la intervención.',
                '6. El paciente manifiesta haber sido informado sobre las características del tratamiento y el enfoque de la terapeuta, y que se han respondido todas sus dudas.',
            ]},
            { heading: 'Consentimiento', lines: [
                `Paciente: ${val(p?.nombre)}`,
                'La firma del presente contrato terapéutico supone el consentimiento de todas las partes implicadas para que el programa de tratamiento se desarrolle conforme a las condiciones reseñadas.',
            ]},
            { heading: 'Firmas', lines: [
                `Fecha: ${fechaLarga()}`,
                '',
                'El/La paciente: ____________________________',
                '',
                `Psicoterapeuta: ${PROFESIONAL.nombre} — Cód. MINSA: ${PROFESIONAL.codigoMinsa}`,
            ]},
        ],
    };
}

function consentimientoInfantil(p) {
    return {
        secciones: [
            { heading: '', lines: [
                'ASENTIMIENTO INFORMADO — PSICOTERAPIA INFANTIL',
                `${PROFESIONAL.nombre} — Psicóloga — Cel: ${PROFESIONAL.celular} — Cód. MINSA: ${PROFESIONAL.codigoMinsa}`,
            ]},
            { heading: 'Finalidad', lines: [
                'Especificar las condiciones generales de funcionamiento del programa psicoterapéutico que va a comenzar, con los compromisos que deben respetar las partes para su adecuado desarrollo.',
            ]},
            { heading: 'Compromisos del psicólogo', lines: [
                '1. Velar por la adecuación científica y profesional de los programas de tratamiento.',
                '2. Respetar el Código Deontológico de la profesión, incluida la confidencialidad de los datos.',
                '3. Sesiones de aproximadamente 50 minutos, con periodicidad de una sesión semanal (excepcionalmente dos).',
                '4. Si el problema requiere un recurso diferente, informar sobre otros profesionales más adecuados.',
            ]},
            { heading: 'Compromiso del paciente / representante', lines: [
                '1. Asistencia regular y puntual. Dos faltas consecutivas sin aviso dan por terminado el tratamiento.',
                '2. Tolerancia de 15 minutos de retraso.',
                '3. Honorarios de 700 córdobas por sesión, cancelados previa o inmediatamente después de la sesión.',
                '4. Realizar las tareas clínicas indicadas por la terapeuta.',
                '5. Facilitar el contacto con familiares cuando la terapeuta lo indique y previo acuerdo.',
            ]},
            { heading: 'Autorización', lines: [
                `Por medio de la presente, yo ${val(p?.tutorNombre)}, con identificación ${val(p?.tutorIdentificacion)}, en calidad de representante legal (${val(p?.tutorRelacion, 'parentesco')}) de ${val(p?.nombre)}, menor de edad, con fecha de nacimiento ${val(p?.fechaNacimiento ? fechaLarga(p.fechaNacimiento) : '')}, AUTORIZO iniciar un proceso terapéutico con la ${PROFESIONAL.nombre}, ${PROFESIONAL.profesion}, código MINSA Nº ${PROFESIONAL.codigoMinsa}.`,
                '',
                `Acepto que el tratamiento se desarrollará en sesiones de 50 minutos, con frecuencia ${BLANK} los días ${BLANK}. Los honorarios de cada sesión serán de 700 córdobas y comprendo que deberán abonarse según los términos del contrato.`,
                '',
                'Manifiesto haber leído el acuerdo terapéutico anexado y acepto los derechos y obligaciones que como representante legal debo cumplir. He sido informado(a) sobre las características y fases del proceso y el enfoque del profesional, y se han respondido todas mis dudas.',
            ]},
            { heading: 'Firmas', lines: [
                `Fecha: ${fechaLarga()}`,
                '',
                `Firma del tutor (${val(p?.tutorNombre, 'representante')}): ____________________  Identificación: ${val(p?.tutorIdentificacion, '____________')}`,
                '',
                `Firma del profesional: ${PROFESIONAL.nombre} — Cód. MINSA: ${PROFESIONAL.codigoMinsa}`,
                '',
                'Firma del paciente: ____________________',
            ]},
        ],
    };
}

function entrevista(p) {
    const cr = p?.clinicalRecord || {};
    return {
        secciones: [
            { heading: 'I. Datos generales', lines: [
                `Nombres y apellidos: ${val(p?.nombre)}`,
                `Edad: ${val(p?.edad)}        Género: ${val(p?.sexo)}        Estado civil: ${val(p?.estadoCivil)}`,
                `Ocupación: ${val(p?.ocupacion)}        Escolaridad: ${val(p?.escolaridad)}`,
                `N° Celular: ${val(p?.telefono)}        Fecha: ${fechaLarga()}`,
                `Remisión: ${val(p?.remision)}        Situación laboral: ${val(p?.situacionLaboral)}`,
                `Barrio: ${val(p?.barrio)}        N° de hijas/os: ${val(p?.numHijos)}`,
                `Cómo le llaman en casa: ${val(p?.apodo)}`,
                `Nombre de la madre: ${val(p?.nombreMadre)}   Teléfono: ${val(p?.telefonoMadre)}`,
                `Nombre del padre: ${val(p?.nombrePadre)}   Teléfono: ${val(p?.telefonoPadre)}`,
                `¿Padece alguna enfermedad?: ${val(cr.antecedentesMedicos, BLANK)}`,
            ]},
            { heading: 'II. Motivo de consulta', lines: [
                `¿Por qué está aquí?: ${val(p?.motivo)}`,
                '¿Cuál es su mayor preocupación?:',
                BLANK,
            ]},
            { heading: 'III. Antecedentes relevantes', lines: [
                `Personales: ${BLANK}`,
                `Familiares: ${val(cr.antecedentesFamiliares, BLANK)}`,
                `Médicos: ${val(cr.antecedentesMedicos, BLANK)}`,
                `Psicológicos: ${BLANK}`,
            ]},
            { heading: 'IV. Historia del problema actual', lines: [BLANK] },
            { heading: 'V. Contexto actual', lines: [BLANK] },
            { heading: 'VI. Área familiar', lines: [BLANK] },
            { heading: 'VII. Área amorosa / matrimonial', lines: [BLANK] },
            { heading: 'VIII. Área laboral', lines: [BLANK] },
            { heading: 'IX. Área social', lines: [
                '¿Con qué personas se siente más cómoda?:', BLANK,
                '¿Cuáles son sus metas?:', BLANK,
            ]},
            { heading: 'X. Observación de conducta y estado emocional', lines: [BLANK] },
            { heading: 'XI. Impresión diagnóstica inicial', lines: [val(cr.diagnostico, BLANK)] },
            { heading: '', lines: [`Firma del profesional: ${PROFESIONAL.nombre}`] },
        ],
    };
}

function historialClinico(p) {
    const cr = p?.clinicalRecord || {};
    return {
        secciones: [
            { heading: 'Datos generales', lines: [
                `Fecha: ${fechaLarga()}        Hora: ______        No. de expediente: ${val(p?.id)}`,
                `Nombre: ${val(p?.nombre)}        Edad: ${val(p?.edad)}        Sexo: ${val(p?.sexo)}`,
                `Nombre del padre: ${val(p?.nombrePadre)}        Nombre de la madre: ${val(p?.nombreMadre)}`,
                `Dirección: ${val(p?.direccion)}        Barrio: ${val(p?.barrio)}`,
                `Teléfono: ${val(p?.telefono)}        Nivel escolar: ${val(p?.escolaridad)}`,
                `Lugar y fecha de nacimiento: ${val(p?.lugarNacimiento)}, ${val(p?.fechaNacimiento ? fechaLarga(p.fechaNacimiento) : '')}`,
                `Atendido por: ${PROFESIONAL.nombre}`,
                `Informante: ${val(p?.tutorNombre, BLANK)}        Referente: ${val(p?.remision)}`,
            ]},
            { heading: 'I. Familiograma', lines: [BLANK] },
            { heading: 'II. Motivo de consulta', lines: [val(p?.motivo)] },
            { heading: 'III. Padecimiento actual', lines: [BLANK] },
            { heading: 'IV. Historia del padecimiento actual', lines: [BLANK] },
            { heading: 'V. Antecedentes patológicos personales', lines: [val(cr.antecedentesMedicos, BLANK)] },
            { heading: 'VI. Antecedentes patológicos familiares', lines: [val(cr.antecedentesFamiliares, BLANK)] },
            { heading: 'VII. Hábitos tóxicos personales', lines: [BLANK] },
            { heading: 'VIII. Hábitos tóxicos familiares', lines: [BLANK] },
            { heading: 'IX. Etapa de desarrollo del paciente', lines: [
                val(cr.historiaDesarrollo, 'Prenatal, perinatal, posnatal e infantil, lenguaje, hábitos, desarrollo personal-social, escolar, adolescencia, laboral.'),
            ]},
            { heading: 'X. Diagnóstico', lines: [val(cr.diagnostico, BLANK)] },
            { heading: 'XI. Dx diferencial', lines: [BLANK] },
            { heading: 'XII. Examen psicológico (tiempo, espacio y persona)', lines: [BLANK] },
            { heading: 'XIII. Examen físico', lines: [BLANK] },
            { heading: 'XIV. Plan terapéutico', lines: [
                val(cr.planIntervencion, 'Tabla: Fecha/Sesión · Objetivo · Acciones terapéuticas · Observación.'),
            ]},
        ],
    };
}

function perfilClinico(p) {
    const cr = p?.clinicalRecord || {};
    return {
        secciones: [
            { heading: 'Datos del paciente', lines: [
                `Nombre: ${val(p?.nombre)}        Edad: ${val(p?.edad)}`,
                `Expediente #${val(p?.id)}        Fecha: ${fechaLarga()}`,
                `Profesional: ${PROFESIONAL.nombre} — Cód. MINSA ${PROFESIONAL.codigoMinsa}`,
            ]},
            { heading: 'Motivo de consulta', lines: [val(p?.motivo)] },
            { heading: 'Análisis de resultados de pruebas', lines: [val(cr.analisisPruebas, 'Sin información registrada.')] },
            { heading: 'Perfil clínico', lines: [val(cr.perfilClinico, 'Sin información registrada.')] },
            { heading: 'Impresión diagnóstica', lines: [val(cr.diagnostico, 'Sin información registrada.')] },
        ],
    };
}

function planIntervencion(p) {
    const cr = p?.clinicalRecord || {};
    const goals = Array.isArray(p?.therapeuticGoals) ? p.therapeuticGoals : [];
    const objetivos = goals.length
        ? goals.map((g, i) => `${i + 1}. ${g.titulo}${g.descripcion ? ' — ' + g.descripcion : ''} [${g.estado || 'Pendiente'}]`)
        : ['Sin objetivos registrados.'];
    return {
        secciones: [
            { heading: 'Datos del paciente', lines: [
                `Nombre: ${val(p?.nombre)}        Expediente #${val(p?.id)}`,
                `Fase del proceso: ${val(p?.faseProceso, 'EvaluacionInicial')}        Fecha: ${fechaLarga()}`,
            ]},
            { heading: 'Plan de intervención', lines: [val(cr.planIntervencion, 'Sin información registrada.')] },
            { heading: 'Objetivos terapéuticos (jerárquicos, de mayor a menor prioridad)', lines: objetivos },
        ],
    };
}

const GENERATORS = {
    'contrato-adultos': contratoAdultos,
    'consentimiento-infantil': consentimientoInfantil,
    'entrevista': entrevista,
    'historial-clinico': historialClinico,
    'perfil-clinico': perfilClinico,
    'plan-intervencion': planIntervencion,
};

/**
 * Genera un documento clínico rellenado con los datos del paciente.
 * @param {string} tipo
 * @param {object} patient  paciente con clinicalRecord y therapeuticGoals incluidos
 * @returns {{tipo,titulo,paciente,fecha,secciones,texto}}
 */
export function generateDocument(tipo, patient) {
    const meta = DOCUMENT_TYPES.find(d => d.tipo === tipo);
    const gen = GENERATORS[tipo];
    if (!meta || !gen) {
        const e = new Error(`Tipo de documento desconocido: ${tipo}`);
        e.statusCode = 400;
        throw e;
    }
    const { secciones } = gen(patient);
    const texto = [
        meta.titulo,
        PROFESIONAL.consultorio,
        '',
        ...secciones.flatMap(s => [s.heading ? `\n${s.heading}` : '', ...s.lines]),
    ].filter(l => l !== undefined).join('\n');

    return {
        tipo,
        titulo: meta.titulo,
        paciente: { id: patient?.id, nombre: patient?.nombre },
        fecha: new Date().toISOString(),
        profesional: PROFESIONAL,
        secciones,
        texto,
    };
}

export default { generateDocument, DOCUMENT_TYPES, PROFESIONAL, HONORARIOS };
