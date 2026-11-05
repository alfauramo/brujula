import type { Job } from '../types';

const DAY = 86_400_000;

export const DEMO_CV_TEXT = `Lucía Martín Ruiz
Psicóloga sanitaria · Madrid
lucia.martin@example.com · +34 600 123 456 · linkedin.com/in/lucia-martin

PERFIL
Psicóloga sanitaria colegiada (M-12345) con 6 años de experiencia en intervención
psicológica con infancia, adolescencia y familias. Trabajo desde un enfoque
cognitivo-conductual y sistémico, con experiencia en evaluación psicológica,
intervención en crisis y coordinación de equipos. Me interesa especialmente el
tercer sector: asociaciones y fundaciones que acompañan a colectivos vulnerables.

EXPERIENCIA
Asociación Punto de Encuentro — Psicóloga (2021 – actualidad)
· Intervención individual y grupal con menores y familias en situación de vulnerabilidad.
· Evaluación psicológica, informes clínicos y coordinación con servicios sociales.
· Diseño y facilitación de talleres de habilidades sociales y parentalidad.
· Coordinación de un equipo de 3 personas y supervisión de prácticas.

Centro de Psicología Albor — Psicóloga sanitaria (2019 – 2021)
· Terapia cognitivo-conductual con población adulta: ansiedad, estado de ánimo y duelo.
· Evaluación psicométrica y elaboración de informes.

FORMACIÓN
Máster en Psicología General Sanitaria — Universidad Complutense de Madrid (2019)
Grado en Psicología — Universidad Autónoma de Madrid (2017)
Formación en terapia familiar sistémica — Escuela de Terapia Familiar (2022)

IDIOMAS
Inglés C1 · Francés B1

OTROS
· Colegiada en el Colegio Oficial de Psicólogos de Madrid.
· Voluntariado en Cruz Roja (acompañamiento a personas mayores).
· Manejo de Excel y herramientas de gestión de casos.`;

interface DemoInput {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: Job['workMode'];
  orgType: Job['orgType'];
  salary?: [number, number];
  currency?: string;
  contractType: string;
  description: string;
  tags: string[];
  days: number;
}

function demoJob(input: DemoInput): Job {
  return {
    id: `demo-${input.id}`,
    source: 'demo',
    title: input.title,
    company: input.company,
    location: input.location,
    workMode: input.workMode,
    orgType: input.orgType,
    contractType: input.contractType,
    salaryMin: input.salary?.[0] ?? null,
    salaryMax: input.salary?.[1] ?? null,
    currency: input.currency ?? 'EUR',
    description: input.description,
    url: '',
    tags: input.tags,
    publishedAt: Date.now() - input.days * DAY,
    fetchedAt: Date.now(),
  };
}

/**
 * Ofertas de ejemplo, verosímiles y marcadas como tales. Sirven para que la
 * app tenga valor desde el primer segundo, sin depender de ninguna API.
 */
export const DEMO_JOBS: Job[] = [
  demoJob({
    id: 'psico-alzheimer',
    title: 'Psicóloga/o para programa de estimulación cognitiva',
    company: 'Asociación de Familiares de Alzheimer',
    location: 'Madrid',
    workMode: 'onsite',
    orgType: 'asociacion',
    salary: [24000, 28000],
    contractType: 'Jornada completa',
    days: 1,
    tags: ['psicología', 'neuropsicología', 'tercera edad', 'asociación'],
    description: `Buscamos psicóloga/o para nuestro centro de día en Madrid. Funciones: evaluación neuropsicológica, diseño de programas de estimulación cognitiva, intervención individual y grupal con personas con deterioro cognitivo y acompañamiento a familias.

Requisitos: Grado en Psicología, máster general sanitario o formación equivalente, experiencia mínima de 2 años con deterioro cognitivo. Valorable formación en Alzheimer y trabajo con asociaciones.

Ofrecemos contrato indefinido, 24.000–28.000 € brutos anuales, supervisión clínica y formación continua.`,
  }),
  demoJob({
    id: 'psico-clinica-valencia',
    title: 'Psicólogo/a sanitario/a — consulta privada',
    company: 'Centro de Psicología Álvarez',
    location: 'Valencia',
    workMode: 'onsite',
    orgType: 'sanitario',
    salary: [22000, 26000],
    contractType: 'Jornada completa',
    days: 3,
    tags: ['psicología clínica', 'adultos', 'terapia cognitivo-conductual'],
    description: `Centro de psicología con 15 años de trayectoria incorpora psicólogo/a sanitario/a para atención a población adulta. Cartera de pacientes propia, supervisión semanal y posibilidad de formación en terapia cognitivo-conductual y EMDR.

Requisitos: máster en Psicología General Sanitaria, colegiación, experiencia en terapia cognitivo-conductual. Valorable experiencia en trauma y terapia de pareja.

Contrato de 30 h semanales con posibilidad de ampliación. 22.000–26.000 € anuales.`,
  }),
  demoJob({
    id: 'orientador-sevilla',
    title: 'Orientador/a laboral para programas de inserción',
    company: 'Fundación Integra',
    location: 'Sevilla',
    workMode: 'hybrid',
    orgType: 'fundacion',
    salary: [23000, 25000],
    contractType: 'Jornada completa',
    days: 5,
    tags: ['orientación laboral', 'inserción', 'fundación', 'colectivos vulnerables'],
    description: `Fundación Integra busca orientador/a laboral para acompañar a personas en situación de exclusión social en su itinerario de inserción. Funciones: diagnóstico de empleabilidad, diseño de itinerarios, intermediación con empresas, talleres de habilidades sociales y seguimiento.

Requisitos: Psicología, Educación Social, Trabajo Social o similar. Experiencia de al menos 2 años en orientación laboral. Valorable conocimiento del tercer sector y de programas financiados por administraciones públicas.

Jornada completa, modelo híbrido (3 días en oficina), 23.000–25.000 €.`,
  }),
  demoJob({
    id: 'seleccion-madrid',
    title: 'Técnico/a de Selección y Desarrollo',
    company: 'Grupo Nortia',
    location: 'Madrid',
    workMode: 'hybrid',
    orgType: 'empresa',
    salary: [26000, 30000],
    contractType: 'Jornada completa',
    days: 2,
    tags: ['recursos humanos', 'selección', 'talento', 'empresa'],
    description: `Consultora de servicios profesionales incorpora técnico/a de selección para gestionar procesos de perfiles técnicos y corporativos. Funciones: definición de perfiles, sourcing, entrevistas por competencias, coordinación con clientes y reporting.

Requisitos: Psicología o ADE/Relaciones Laborales, experiencia de 2–4 años en selección, entrevista por competencias y manejo de LinkedIn Recruiter. Valorable inglés B2.

Ofrecemos híbrido 2 días remotos, 26.000–30.000 € y plan de carrera.`,
  }),
  demoJob({
    id: 'psico-educativo-zaragoza',
    title: 'Psicólogo/a educativo/a — departamento de orientación',
    company: 'Colegio San Gabriel',
    location: 'Zaragoza',
    workMode: 'onsite',
    orgType: 'educativo',
    salary: [21000, 24000],
    contractType: 'Jornada completa',
    days: 7,
    tags: ['psicología educativa', 'orientación', 'infancia', 'colegio'],
    description: `Colegio concertado busca psicólogo/a educativo/a para el departamento de orientación. Funciones: evaluación psicopedagógica, atención a la diversidad, coordinación con tutores y familias, diseño de programas de habilidades sociales y prevención.

Requisitos: Grado en Psicología o Psicopedagogía, formación en atención temprana o educación inclusiva. Experiencia en centros educativos valorable.

Contrato temporal con posibilidad de continuidad, jornada completa, incorporación en septiembre.`,
  }),
  demoJob({
    id: 'psico-malaga-menores',
    title: 'Psicólogo/a para programa de intervención con menores',
    company: 'Ayuntamiento de Málaga',
    location: 'Málaga',
    workMode: 'onsite',
    orgType: 'publico',
    contractType: 'Temporal',
    days: 9,
    tags: ['psicología social', 'menores', 'administración pública', 'intervención'],
    description: `Servicios Sociales del Ayuntamiento de Málaga incorpora psicólogo/a para programa de intervención con menores y familias en situación de riesgo. Funciones: evaluación, intervención familiar, coordinación con centros educativos y servicios sanitarios, elaboración de informes.

Requisitos: Grado en Psicología, colegiación, experiencia en intervención familiar y protección de menores. Se valorará formación en terapia sistémica.

Contrato temporal por programa (9 meses), jornada completa. Retribución según convenio del Ayuntamiento.`,
  }),
  demoJob({
    id: 'psico-infanto-bilbao',
    title: 'Psicoterapeuta infanto-juvenil',
    company: 'Gabinete Crecer',
    location: 'Bilbao',
    workMode: 'onsite',
    orgType: 'sanitario',
    salary: [20000, 25000],
    contractType: 'Media jornada',
    days: 4,
    tags: ['psicoterapia', 'infancia', 'adolescencia', 'terapia familiar'],
    description: `Gabinete especializado en infancia y adolescencia busca psicoterapeuta para incorporarse a un equipo de 5 profesionales. Funciones: terapia individual con menores, terapia familiar, coordinación con colegios y elaboración de informes.

Requisitos: máster sanitario, formación en terapia cognitivo-conductual o sistémica, experiencia con menores. Valorable formación en trauma y apego.

Media jornada ampliable, 20.000–25.000 € a tiempo completo equivalente.`,
  }),
  demoJob({
    id: 'psico-hospital-madrid',
    title: 'Psicólogo/a de urgencias — salud mental',
    company: 'Hospital Universitario La Paz',
    location: 'Madrid',
    workMode: 'onsite',
    orgType: 'sanitario',
    contractType: 'Jornada completa',
    days: 6,
    tags: ['psicología clínica', 'urgencias', 'hospital', 'salud mental'],
    description: `Unidad de Psiquiatría del Hospital Universitario La Paz incorpora psicólogo/a sanitario/a para atención en urgencias y hospitalización. Funciones: evaluación e intervención en crisis, coordinación con psiquiatría y trabajo en equipo multidisciplinar.

Requisitos: máster en Psicología General Sanitaria, experiencia hospitalaria mínima de 2 años, formación en intervención en crisis y riesgo suicida.

Contrato temporal de 12 meses, jornada completa con turnos rotativos.`,
  }),
  demoJob({
    id: 'people-remote',
    title: 'People Partner (remote, English)',
    company: 'Lumen Health',
    location: 'Remoto (Europa)',
    workMode: 'remote',
    orgType: 'empresa',
    salary: [45000, 55000],
    currency: 'EUR',
    contractType: 'Jornada completa',
    days: 2,
    tags: ['recursos humanos', 'people', 'remoto', 'inglés'],
    description: `Lumen Health is hiring a People Partner to support our distributed clinical team. You will own onboarding, employee relations, engagement and manager coaching across Europe.

Requirements: 4+ years in People/HR, experience in remote-first companies, strong communication skills and fluent English. Knowledge of Spanish labour law is a plus.

Remote-first, 45,000–55,000 € per year, flexible hours.`,
  }),
  demoJob({
    id: 'recruiter-remote',
    title: 'Technical Recruiter (remote)',
    company: 'Northwind Labs',
    location: 'Remoto',
    workMode: 'remote',
    orgType: 'empresa',
    salary: [40000, 50000],
    currency: 'EUR',
    contractType: 'Jornada completa',
    days: 11,
    tags: ['recruitment', 'tech', 'remoto', 'inglés'],
    description: `Northwind Labs is looking for a Technical Recruiter to hire engineers across Europe. Responsibilities include sourcing, screening, interview coordination and employer branding.

You have 3+ years of technical recruiting experience, you are comfortable with async work and you speak fluent English. Spanish is a plus.

Fully remote, 40,000–50,000 €, 30 days of holiday.`,
  }),
  demoJob({
    id: 'research-psychology',
    title: 'Research Assistant in Clinical Psychology',
    company: 'University of Amsterdam',
    location: 'Ámsterdam (híbrido)',
    workMode: 'hybrid',
    orgType: 'educativo',
    salary: [36000, 42000],
    currency: 'EUR',
    contractType: 'Temporal',
    days: 8,
    tags: ['investigación', 'psicología clínica', 'inglés', 'universidad'],
    description: `The Department of Clinical Psychology is recruiting a Research Assistant to support a study on anxiety interventions. Tasks: participant recruitment, data collection, quantitative analysis and support in writing publications.

Requirements: MSc in Psychology, experience with quantitative methods (R or SPSS), excellent English writing skills. Experience with clinical populations is valued.

12-month contract, hybrid, 36,000–42,000 € gross per year.`,
  }),
  demoJob({
    id: 'cruz-roja-barcelona',
    title: 'Psicólogo/a para acompañamiento psicosocial',
    company: 'Cruz Roja',
    location: 'Barcelona',
    workMode: 'onsite',
    orgType: 'fundacion',
    salary: [22000, 24000],
    contractType: 'Jornada completa',
    days: 12,
    tags: ['psicología social', 'acompañamiento', 'fundación', 'vulnerabilidad'],
    description: `Cruz Roja busca psicólogo/a para el programa de acompañamiento psicosocial a personas migrantes y refugiadas. Funciones: primera acogida, evaluación de necesidades, intervención individual y grupal, derivación y coordinación con recursos comunitarios.

Requisitos: Grado en Psicología, experiencia en intervención psicosocial, sensibilidad intercultural. Valorable inglés, francés o árabe.

Jornada completa, 22.000–24.000 €, contrato de un año renovable.`,
  }),
  demoJob({
    id: 'igualdad-cadiz',
    title: 'Técnico/a de igualdad y violencia de género',
    company: 'Diputación de Cádiz',
    location: 'Cádiz',
    workMode: 'onsite',
    orgType: 'publico',
    contractType: 'Temporal',
    days: 14,
    tags: ['igualdad', 'violencia de género', 'administración pública', 'intervención'],
    description: `Diputación de Cádiz incorpora técnico/a de igualdad para el desarrollo de programas de prevención y atención a víctimas de violencia de género. Funciones: diseño de programas, atención directa, formación y coordinación con municipios.

Requisitos: titulación en Psicología, Educación Social, Trabajo Social o similar; formación específica en igualdad y violencia de género; experiencia en administración pública valorable.

Contrato temporal por proyecto, jornada completa.`,
  }),
  demoJob({
    id: 'psico-navarra',
    title: 'Psicólogo/a clínico/a — unidad de dolor crónico',
    company: 'Clínica Universidad de Navarra',
    location: 'Pamplona',
    workMode: 'onsite',
    orgType: 'sanitario',
    contractType: 'Jornada completa',
    days: 16,
    tags: ['psicología clínica', 'dolor crónico', 'hospital', 'evaluación'],
    description: `Unidad de Dolor Crónico busca psicólogo/a clínico/a para evaluación e intervención en pacientes con dolor persistente. Enfoque cognitivo-conductual y terapia de aceptación y compromiso.

Requisitos: máster sanitario, formación en dolor crónico o psicología de la salud, experiencia hospitalaria. Valorable doctorado.

Contrato indefinido tras periodo de prueba, jornada completa.`,
  }),
  demoJob({
    id: 'formador-madrid',
    title: 'Formador/a en habilidades sociales y empleabilidad',
    company: 'Asociación La Rueca',
    location: 'Madrid',
    workMode: 'onsite',
    orgType: 'asociacion',
    salary: [21000, 23000],
    contractType: 'Media jornada',
    days: 5,
    tags: ['formación', 'habilidades sociales', 'asociación', 'empleabilidad'],
    description: `Asociación La Rueca busca formador/a para talleres de habilidades sociales, comunicación y preparación para el empleo dirigidos a jóvenes en situación de vulnerabilidad.

Funciones: diseño y facilitación de talleres, acompañamiento individual, coordinación con el equipo educativo y evaluación de resultados.

Requisitos: Psicología, Educación Social o similar; experiencia en formación grupal con adolescentes; capacidad de trabajo en red.

Media jornada (20 h), 21.000–23.000 € a jornada completa equivalente.`,
  }),
  demoJob({
    id: 'fundacion-mujeres',
    title: 'Psicólogo/a para atención a víctimas de violencia sexual',
    company: 'Fundación Mujeres',
    location: 'Madrid',
    workMode: 'hybrid',
    orgType: 'fundacion',
    salary: [25000, 28000],
    contractType: 'Jornada completa',
    days: 3,
    tags: ['violencia de género', 'trauma', 'fundación', 'intervención'],
    description: `Fundación Mujeres incorpora psicólogo/a para su servicio de atención a víctimas de violencia sexual. Funciones: evaluación, intervención terapéutica individual y grupal, acompañamiento en procesos judiciales y coordinación con recursos públicos.

Requisitos: Grado en Psicología, máster sanitario, formación específica en trauma y violencia de género. Experiencia mínima de 3 años.

Jornada completa, modelo híbrido, 25.000–28.000 €.`,
  }),
  demoJob({
    id: 'wellbeing-remote',
    title: 'Wellbeing Specialist (remote, English)',
    company: 'BetterSpace',
    location: 'Remoto (UE)',
    workMode: 'remote',
    orgType: 'empresa',
    salary: [38000, 46000],
    currency: 'EUR',
    contractType: 'Jornada completa',
    days: 6,
    tags: ['bienestar', 'salud mental', 'remoto', 'inglés'],
    description: `BetterSpace is looking for a Wellbeing Specialist to design and deliver mental health programmes for corporate clients. You will facilitate workshops, create content and support a network of clinicians.

Requirements: background in psychology or mental health, 3+ years of experience, strong facilitation skills and fluent English. Experience in digital health is a plus.

Remote within the EU, 38,000–46,000 €, learning budget.`,
  }),
  demoJob({
    id: 'psico-deportivo',
    title: 'Psicólogo/a deportivo/a',
    company: 'Club Deportivo Levante',
    location: 'Valencia',
    workMode: 'onsite',
    orgType: 'empresa',
    salary: [24000, 27000],
    contractType: 'Media jornada',
    days: 10,
    tags: ['psicología deportiva', 'rendimiento', 'club', 'acompañamiento'],
    description: `Club deportivo incorpora psicólogo/a para acompañar a deportistas de categorías inferiores y primer equipo. Funciones: evaluación psicológica, entrenamiento en habilidades mentales, intervención en lesiones y trabajo con entrenadores y familias.

Requisitos: Grado en Psicología, máster en Psicología del Deporte, experiencia con deportistas. Colegiación obligatoria.

Media jornada con disponibilidad los fines de semana. 24.000–27.000 € a jornada completa equivalente.`,
  }),
  demoJob({
    id: 'director-centro-dia',
    title: 'Director/a técnico/a de centro de día',
    company: 'Grupo Senda',
    location: 'Sevilla',
    workMode: 'onsite',
    orgType: 'empresa',
    salary: [30000, 34000],
    contractType: 'Jornada completa',
    days: 18,
    tags: ['dirección', 'centro de día', 'coordinación', 'salud mental'],
    description: `Grupo Senda busca director/a técnico/a para centro de día de salud mental. Funciones: dirección del equipo multidisciplinar, coordinación asistencial, gestión de casos, relación con familias y administraciones, control de calidad y memoria anual.

Requisitos: Psicología, máster sanitario, experiencia de 4 años en salud mental y al menos 2 en coordinación de equipos.

Jornada completa, 30.000–34.000 €, contrato indefinido.`,
  }),
  demoJob({
    id: 'practicas-balia',
    title: 'Prácticas en psicología educativa',
    company: 'Fundación Balia',
    location: 'Madrid',
    workMode: 'onsite',
    orgType: 'fundacion',
    contractType: 'Prácticas',
    days: 4,
    tags: ['prácticas', 'psicología educativa', 'infancia', 'fundación'],
    description: `Fundación Balia ofrece prácticas curriculares en su equipo de intervención socioeducativa. Podrás participar en evaluación, talleres de habilidades sociales y acompañamiento a familias, con supervisión semanal.

Requisitos: estar cursando Psicología, Educación Social o similar; interés por la infancia en riesgo de exclusión; disponibilidad de 20 h semanales.

Beca de prácticas según convenio y formación continua.`,
  }),
  demoJob({
    id: 'frontend-remote',
    title: 'Frontend Developer (React + TypeScript)',
    company: 'Tandem Studio',
    location: 'Remoto (España)',
    workMode: 'remote',
    orgType: 'empresa',
    salary: [38000, 48000],
    contractType: 'Jornada completa',
    days: 2,
    tags: ['react', 'typescript', 'frontend', 'remoto'],
    description: `Buscamos frontend developer para producto SaaS B2B. Stack: React 19, TypeScript, Vite y Tailwind. Funciones: desarrollo de interfaz, accesibilidad, pruebas con Vitest y colaboración con diseño y producto.

Requisitos: 3+ años con React y TypeScript, experiencia con testing y atención al detalle. Valorable conocimiento de accesibilidad y diseño de sistemas.

100% remoto en España, 38.000–48.000 €, 4 días de trabajo intensivo y viernes de aprendizaje.`,
  }),
  demoJob({
    id: 'data-madrid',
    title: 'Data Analyst — marketing',
    company: 'Aurora Media',
    location: 'Madrid',
    workMode: 'hybrid',
    orgType: 'empresa',
    salary: [32000, 38000],
    contractType: 'Jornada completa',
    days: 7,
    tags: ['data', 'sql', 'power bi', 'marketing'],
    description: `Equipo de marketing analítico busca data analyst para medir campañas y construir dashboards. Funciones: SQL, modelado de datos, Power BI, definición de KPIs y experimentación.

Requisitos: 2+ años en análisis de datos, SQL avanzado, Excel y Power BI o Tableau. Valorable Python y dbt.

Híbrido 2 días en oficina, 32.000–38.000 €.`,
  }),
  demoJob({
    id: 'product-designer',
    title: 'Product Designer',
    company: 'Kite Health',
    location: 'Barcelona',
    workMode: 'hybrid',
    orgType: 'empresa',
    salary: [34000, 42000],
    contractType: 'Jornada completa',
    days: 13,
    tags: ['ux', 'ui', 'figma', 'producto'],
    description: `Kite Health busca product designer para mejorar la experiencia de su plataforma de salud digital. Funciones: investigación de usuarios, prototipado en Figma, diseño de flujos y colaboración con ingeniería.

Requisitos: 3+ años en diseño de producto, portfolio sólido, experiencia con design systems y pruebas de usabilidad.

Híbrido en Barcelona, 34.000–42.000 €.`,
  }),
  demoJob({
    id: 'customer-success',
    title: 'Customer Success Manager',
    company: 'Nexo Cloud',
    location: 'Barcelona',
    workMode: 'hybrid',
    orgType: 'empresa',
    salary: [30000, 36000],
    contractType: 'Jornada completa',
    days: 9,
    tags: ['customer success', 'saas', 'inglés', 'atención al cliente'],
    description: `Nexo Cloud incorpora Customer Success Manager para acompañar a clientes enterprise. Funciones: onboarding, seguimiento de métricas de adopción, resolución de incidencias y detección de oportunidades de ampliación.

Requisitos: 2+ años en customer success o consultoría, inglés B2/C1, habilidades de comunicación y orientación a resultados.

Híbrido en Barcelona, 30.000–36.000 €.`,
  }),
  demoJob({
    id: 'administrativo-remote',
    title: 'Administrativo/a con inglés',
    company: 'Nordic Support',
    location: 'Remoto (España)',
    workMode: 'remote',
    orgType: 'empresa',
    salary: [20000, 23000],
    contractType: 'Jornada completa',
    days: 15,
    tags: ['administración', 'inglés', 'remoto', 'atención al cliente'],
    description: `Buscamos administrativo/a para soporte a un equipo internacional. Funciones: gestión de agenda, facturación, atención por email y teléfono, coordinación de viajes y actualización de bases de datos.

Requisitos: experiencia administrativa, Excel intermedio, inglés B2. Valorable experiencia en empresas internacionales.

100% remoto, 20.000–23.000 €, horario flexible.`,
  }),
];
