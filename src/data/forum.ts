// Fórum de dúvidas: dados de demonstração.
// As respostas do mentor são exemplos de conteúdo e devem ser revisadas pelo cliente.

export interface Thread {
  id: string;
  title: string;
  body: string;
  authorId: string;
  createdAt: string; // ISO
  moduleId: string;
  lessonId?: string;
  votes: string[]; // ids de quem marcou "também tenho essa dúvida"
  solutionId?: string; // resposta marcada como a que resolveu
}

export interface Reply {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO
  votes: string[]; // ids de quem achou útil
}

/** Data relativa a agora: horas atrás. */
const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

export function seedForum(): { threads: Thread[]; replies: Reply[] } {
  const threads: Thread[] = [
    {
      id: "duv-1",
      title: "Quando parar de procurar o MB2?",
      body:
        "Num primeiro molar superior, removi a dentina do assoalho com ultrassom, usei magnificação e mesmo assim não encontrei o MB2. Até onde vale insistir antes de obturar só com três canais? Fico com medo de desgastar demais.",
      authorId: "u-camila",
      createdAt: ago(52),
      moduleId: "mod-3",
      lessonId: "aula-10",
      votes: ["u-juliana", "u-thiago", "u-marina"],
      solutionId: "res-1",
    },
    {
      id: "duv-2",
      title: "Glide path manual antes da reciprocante em curvatura abrupta?",
      body:
        "Em canais com curvatura abrupta no terço apical, vocês sempre fazem glide path manual antes da lima reciprocante ou dá para ir direto com a lima de glide mecanizada?",
      authorId: "u-rafael",
      createdAt: ago(30),
      moduleId: "mod-4",
      lessonId: "aula-14",
      votes: ["u-camila"],
    },
    {
      id: "duv-3",
      title: "Localizador apical instável em dente com polpa vital",
      body:
        "A leitura do localizador fica pulando quando o canal tem polpa vital e sangramento. Já sequei com cone de papel, mas continua instável. Alguma dica?",
      authorId: "u-juliana",
      createdAt: ago(7),
      moduleId: "mod-3",
      lessonId: "aula-11",
      votes: ["u-thiago"],
    },
    {
      id: "duv-4",
      title: "Hipoclorito a 2,5% ou 5,25% no dia a dia?",
      body: "Na clínica eu uso 2,5% por costume. Vale a pena mudar a concentração ou o que pesa mais é volume e agitação?",
      authorId: "u-thiago",
      createdAt: ago(96),
      moduleId: "mod-5",
      lessonId: "aula-16",
      votes: ["u-rafael", "u-camila"],
      solutionId: "res-5",
    },
    {
      id: "duv-5",
      title: "Qual periapical usar para documentar os casos da mentoria?",
      body: "Para os casos que vamos discutir nos encontros, a radiografia digital do consultório serve ou precisa de algum padrão específico de posicionador?",
      authorId: "u-marina",
      createdAt: ago(3),
      moduleId: "mod-1",
      lessonId: "aula-3",
      votes: [],
    },
    {
      id: "duv-6",
      title: "Pedir tomografia antes de todo retratamento?",
      body: "Nos retratamentos que chegam no consultório, vocês pedem CBCT sempre ou só em situações específicas?",
      authorId: "u-camila",
      createdAt: ago(140),
      moduleId: "mod-2",
      lessonId: "aula-6",
      votes: ["u-marina"],
    },
  ];

  const replies: Reply[] = [
    {
      id: "res-1",
      threadId: "duv-1",
      authorId: "u-mentor",
      body:
        "Ótima pergunta. Siga a linha do sulco entre o MV e o palatino, removendo dentina com ultrassom em passos curtos e checando sempre na magnificação. Se depois de 1 a 2 mm de busca orientada ainda não aparecer nada, pare: o desgaste extra enfraquece o dente. Documente, obture os canais encontrados e, se houver sintomas persistentes, a tomografia ajuda a decidir. Vamos ver um caso assim no próximo encontro.",
      createdAt: ago(48),
      votes: ["u-camila", "u-juliana", "u-rafael"],
    },
    {
      id: "res-2",
      threadId: "duv-1",
      authorId: "u-rafael",
      body: "Complementando: corar o assoalho com azul de metileno me ajudou a enxergar a linha do sulco.",
      createdAt: ago(40),
      votes: ["u-camila"],
    },
    {
      id: "res-3",
      threadId: "duv-2",
      authorId: "u-mentor",
      body:
        "Em curvatura abrupta, comece com lima manual fina para sentir a anatomia e confirmar a patência. Com o caminho livre e reproduzível, a lima de glide mecanizada fica segura. O que não vale é levar a reciprocante a um canal sem caminho confirmado.",
      createdAt: ago(26),
      votes: ["u-rafael"],
    },
    {
      id: "res-4",
      threadId: "duv-4",
      authorId: "u-rafael",
      body: "Eu uso 2,5% e renovo bastante a solução. Tenho tido bons resultados.",
      createdAt: ago(90),
      votes: [],
    },
    {
      id: "res-5",
      threadId: "duv-4",
      authorId: "u-mentor",
      body:
        "Concentração ajuda, mas volume, renovação frequente e agitação pesam tanto quanto. Com 2,5% bem renovado e agitado você está em um protocolo consistente. O protocolo completo está no PDF da aula de irrigação final.",
      createdAt: ago(85),
      votes: ["u-thiago", "u-camila"],
    },
    {
      id: "res-6",
      threadId: "duv-6",
      authorId: "u-mentor",
      body:
        "Não em todos. Peça quando a periapical não responde à pergunta clínica: suspeita de canal não tratado, reabsorção, perfuração ou lesão que não bate com a imagem 2D. A aula de tomografia traz os critérios que usamos.",
      createdAt: ago(130),
      votes: ["u-camila", "u-marina"],
    },
  ];

  return { threads, replies };
}
