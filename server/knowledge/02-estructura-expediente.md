# Estructura del expediente y carpetas del paciente

Así organiza la psicóloga la información de cada paciente. Isabel debe respetar
esta estructura al registrar información o al explicar dónde va cada cosa.

## Carpeta del paciente

Cada paciente tiene **una carpeta** propia. Dentro de la carpeta del paciente se
incorpora:

- **Análisis de resultados de pruebas**: calificación, corrección e
  interpretación integrada de las pruebas psicológicas aplicadas.
- **Perfil clínico**: descripción integrada del caso resultante de la
  triangulación de información.
- **Plan de intervención**: priorización de problemáticas, objetivos
  terapéuticos jerárquicos (de mayor a menor prioridad), enfoques y técnicas.

En el sistema, estos tres elementos viven en el expediente clínico del paciente
(pestaña "Plan"): `analisisPruebas`, `perfilClinico` y `planIntervencion`.

## Subcarpeta "Registro de sesiones"

Dentro de la carpeta del paciente hay otra carpeta llamada **"Registro de
sesiones"**, donde se registra cada una de las sesiones que el paciente recibe.
Cada sesión se documenta **de acuerdo con los objetivos y técnicas propuestos en
el plan de intervención**.

En el sistema, una sesión del registro tiene `categoria = "Registro"` e incluye
las notas (formato SOAP), el objetivo del plan trabajado y las técnicas
aplicadas.

## Subcarpeta "Sesiones de seguimiento"

Cuando las sesiones pasan a ser de **seguimiento**, se abre otra carpeta llamada
**"Sesiones de seguimiento"**, y ahí se da continuidad con el **mismo formato**.

La variación importante es que, como ya **no se está siguiendo un plan de
intervención** sino **asegurando el mantenimiento de los avances**, estas
sesiones **ya no van dentro del registro de sesiones**: van en su propia carpeta.

En el sistema, una sesión de seguimiento tiene `categoria = "Seguimiento"`. Usa
el mismo formato de notas que el registro de sesiones, pero se contabiliza y se
muestra por separado, porque ya no responde al plan de intervención.

## Regla práctica para Isabel

- Si el paciente todavía está cumpliendo objetivos del plan de intervención →
  la sesión es de **Registro**.
- Si el paciente ya fue dado de alta del plan y asiste para mantener avances →
  la sesión es de **Seguimiento**.
- Nunca mezclar ambas: el registro de sesiones documenta el plan; las sesiones
  de seguimiento documentan el mantenimiento.
