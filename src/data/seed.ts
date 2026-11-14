// Conteúdo de demonstração da mentoria.
// Tudo aqui pode ser editado pelo painel do mentor (/admin); estes são apenas os dados iniciais.
// Os vídeos de exemplo são clipes de domínio público (CC0, MDN) e devem ser trocados
// pelos links reais das aulas (YouTube, Vimeo ou arquivo .mp4).

export type Role = "aluno" | "mentor";

export interface Material {
  id: string;
  name: string;
  url: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  durationMin: number;
  videoUrl: string;
  materials: Material[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  city?: string;
  joinedAt: string; // ISO date
}

export interface LiveMeeting {
  id: string;
  title: string;
  startsAt: string; // ISO datetime
  durationMin: number;
  link: string;
}

const VIDEO_A = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const VIDEO_B = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4";

const GUIA = { id: "mat-guia", name: "Guia da mentoria (PDF)", url: "/materiais/guia-da-mentoria.pdf" };
const PROTOCOLO = { id: "mat-irrigacao", name: "Protocolo de irrigação (PDF)", url: "/materiais/protocolo-de-irrigacao.pdf" };

let n = 0;
const lesson = (title: string, durationMin: number, description: string, materials: Material[] = []): Lesson => {
  n += 1;
  return {
    id: `aula-${n}`,
    title,
    description,
    durationMin,
    videoUrl: n % 2 ? VIDEO_A : VIDEO_B,
    materials,
  };
};

export const seedModules: Module[] = [
  {
    id: "mod-1",
    title: "Boas-vindas e método",
    description: "Como a mentoria funciona, o cronograma das 12 semanas e como tirar o máximo dos encontros ao vivo.",
    lessons: [
      lesson("Como a mentoria está organizada", 12, "Visão geral dos módulos, do grupo de alunos e dos encontros quinzenais de discussão de casos.", [GUIA]),
      lesson("Montando sua rotina de estudo", 9, "Um plano semanal realista para quem atende em consultório: quando assistir, quando praticar, quando revisar."),
      lesson("Documentação fotográfica dos seus casos", 18, "Padrão de fotos e radiografias que vamos usar para discutir casos durante a mentoria."),
    ],
  },
  {
    id: "mod-2",
    title: "Diagnóstico e planejamento",
    description: "Testes de sensibilidade, leitura de radiografia e tomografia, e como decidir entre tratar, retratar ou encaminhar.",
    lessons: [
      lesson("Anamnese e testes de sensibilidade", 22, "Testes térmicos, elétricos, percussão e palpação: o que cada um responde e como registrar."),
      lesson("Leitura radiográfica periapical", 26, "Sistemática para ler a periapical sem pular etapas, com 10 casos comentados."),
      lesson("Quando pedir tomografia", 19, "Indicações reais de CBCT em endodontia e como ler os cortes que importam."),
      lesson("Plano de tratamento e prognóstico", 24, "Como apresentar o plano ao paciente e documentar o prognóstico de forma clara."),
    ],
  },
  {
    id: "mod-3",
    title: "Acesso e localização de canais",
    description: "Cavidade de acesso conservadora, anatomia interna por grupo dental e a busca pelo MB2.",
    lessons: [
      lesson("Anatomia interna por grupo dental", 28, "Número de canais, curvaturas e variações mais frequentes em cada grupo dental."),
      lesson("Cavidade de acesso conservadora", 21, "Desgaste mínimo com acesso em linha reta: brocas, sequência e erros comuns."),
      lesson("Localizando o MB2", 17, "Magnificação, ultrassom e o mapa do assoalho da câmara pulpar para não deixar o MB2 para trás."),
      lesson("Odontometria eletrônica", 15, "Uso do localizador apical, confirmação radiográfica e registro do comprimento de trabalho."),
    ],
  },
  {
    id: "mod-4",
    title: "Instrumentação mecanizada",
    description: "Sistemas rotatórios e reciprocantes, glide path e como instrumentar canais curvos com segurança.",
    lessons: [
      lesson("Glide path manual e mecanizado", 16, "Por que o glide path vem antes de tudo e como fazer em canais atresiados."),
      lesson("Sistemas rotatórios", 27, "Cinemática, torque e velocidade: configurando o motor para cada sistema."),
      lesson("Sistemas reciprocantes", 23, "Lima única reciprocante passo a passo, com indicações e limites."),
      lesson("Prevenindo fratura de instrumento", 20, "Fadiga cíclica, torção e o protocolo de descarte que evita acidentes."),
    ],
  },
  {
    id: "mod-5",
    title: "Irrigação e agitação",
    description: "Hipoclorito, EDTA e clorexidina na ordem certa, e os métodos de agitação que fazem diferença.",
    lessons: [
      lesson("Soluções irrigadoras", 18, "Concentrações, tempo de contato e interações entre as soluções.", [PROTOCOLO]),
      lesson("Agitação ultrassônica e sônica", 14, "Irrigação ultrassônica passiva e dispositivos sônicos: como e quando usar."),
      lesson("Protocolo final de irrigação", 12, "A sequência completa que usamos na clínica, pronta para imprimir.", [PROTOCOLO]),
    ],
  },
  {
    id: "mod-6",
    title: "Obturação e selamento coronário",
    description: "Cone único, onda contínua e o selamento que protege o tratamento até a restauração definitiva.",
    lessons: [
      lesson("Seleção e prova do cone", 13, "Calibração do cone principal e a radiografia de prova."),
      lesson("Técnica de cone único com biocerâmico", 21, "Indicações, passo a passo e limites do cimento biocerâmico."),
      lesson("Onda contínua de condensação", 25, "Termoplastificação para canais com anatomia complexa."),
      lesson("Selamento coronário e encaminhamento", 11, "Como deixar o dente pronto para a restauração e orientar o paciente."),
    ],
  },
];

export const seedUsers: User[] = [
  {
    id: "u-camila",
    name: "Camila Rocha",
    email: "aluna@endoevolution.com",
    password: "demo123",
    role: "aluno",
    city: "Belo Horizonte, MG",
    joinedAt: "2026-09-21",
  },
  {
    id: "u-mentor",
    name: "Equipe Endo Evolution",
    email: "mentor@endoevolution.com",
    password: "demo123",
    role: "mentor",
    joinedAt: "2026-08-01",
  },
  { id: "u-rafael", name: "Rafael Mendes", email: "rafael.mendes@exemplo.com", password: "demo123", role: "aluno", city: "Curitiba, PR", joinedAt: "2026-09-21" },
  { id: "u-juliana", name: "Juliana Prado", email: "juliana.prado@exemplo.com", password: "demo123", role: "aluno", city: "Recife, PE", joinedAt: "2026-09-21" },
  { id: "u-thiago", name: "Thiago Albuquerque", email: "thiago.alb@exemplo.com", password: "demo123", role: "aluno", city: "Goiânia, GO", joinedAt: "2026-10-05" },
  { id: "u-marina", name: "Marina Couto", email: "marina.couto@exemplo.com", password: "demo123", role: "aluno", city: "Campinas, SP", joinedAt: "2026-10-05" },
];

// Aulas concluídas por aluno no início da demonstração (ids na ordem do curso).
const firstN = (count: number) => seedModules.flatMap((m) => m.lessons).slice(0, count).map((l) => l.id);

export const seedCompleted: Record<string, string[]> = {
  "u-camila": firstN(9), // módulos 1 e 2 completos + 2 aulas do módulo 3
  "u-rafael": firstN(14),
  "u-juliana": firstN(7),
  "u-thiago": firstN(3),
  "u-marina": firstN(0),
};

export const seedNotes: Record<string, Record<string, string>> = {
  "u-camila": {
    "aula-6": "Pedir CBCT quando houver suspeita de reabsorção ou canal extra que a periapical não resolve.",
    "aula-9": "Ultrassom E1 para remover a dentina do assoalho antes de procurar o MB2.",
  },
};

// Próximas quintas-feiras às 20h, a partir de hoje: a demo sempre mostra encontros futuros.
function nextThursdays(count: number): Date[] {
  const d = new Date();
  d.setHours(20, 0, 0, 0);
  const offset = (4 - d.getDay() + 7) % 7 || (new Date().getHours() >= 21 ? 7 : 0);
  d.setDate(d.getDate() + offset);
  return Array.from({ length: count }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i * 14);
    return x;
  });
}

const [t1, t2, t3] = nextThursdays(3);

export const seedMeetings: LiveMeeting[] = [
  { id: "enc-1", title: "Discussão de casos: localização de canais", startsAt: t1.toISOString(), durationMin: 90, link: "https://meet.google.com/" },
  { id: "enc-2", title: "Plantão de dúvidas: instrumentação", startsAt: t2.toISOString(), durationMin: 60, link: "https://meet.google.com/" },
  { id: "enc-3", title: "Discussão de casos: irrigação", startsAt: t3.toISOString(), durationMin: 90, link: "https://meet.google.com/" },
];
