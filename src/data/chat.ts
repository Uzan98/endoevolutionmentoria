// Chat com o mentor: conversas de demonstração (gravadas pelo seed).
// Textos de exemplo: o cliente deve revisar antes de apresentar.

export interface SeedMessage {
  studentId: string; // dono da conversa
  senderId: string;
  body: string;
  hoursAgo: number;
}

export const seedChat: SeedMessage[] = [
  { studentId: "u-camila", senderId: "u-camila", hoursAgo: 27, body: "Oi, pessoal! Assisti a aula de localização do MB2 e fiquei com uma dúvida de um caso do consultório. Posso te mandar por aqui?" },
  { studentId: "u-camila", senderId: "u-mentor", hoursAgo: 26.5, body: "Oi, Camila! Pode sim, aqui é justamente pra isso. Me conta o caso: dente, idade do paciente e o que você já tentou." },
  { studentId: "u-camila", senderId: "u-camila", hoursAgo: 26, body: "26, paciente de 48 anos. Fiz o desgaste do assoalho com ultrassom, mas a câmara está bem calcificada e não achei a entrada." },
  { studentId: "u-camila", senderId: "u-mentor", hoursAgo: 25.6, body: "Em câmara calcificada vale seguir a linha de desenvolvimento entre o MV e o palatino, cerca de 2 mm mesial ao MV. Se não aparecer com o ultrassom em baixa potência, faça uma tomada radiográfica com angulação mesial antes de aprofundar.\n\nNo encontro de quinta vamos mostrar um caso parecido, passo a passo." },
  { studentId: "u-camila", senderId: "u-camila", hoursAgo: 25.4, body: "Perfeito, muito obrigada! Vou tentar assim e te conto." },
  { studentId: "u-rafael", senderId: "u-rafael", hoursAgo: 3, body: "Boa tarde, equipe! O material do módulo 4 (protocolo de irrigação) vai ter a versão em PDF para imprimir?" },
  { studentId: "u-rafael", senderId: "u-rafael", hoursAgo: 2.9, body: "Queria deixar no consultório pra equipe consultar." },
  { studentId: "u-juliana", senderId: "u-juliana", hoursAgo: 50, body: "Oi! Não vou conseguir participar do encontro ao vivo dessa semana. A gravação fica disponível depois?" },
  { studentId: "u-juliana", senderId: "u-mentor", hoursAgo: 49, body: "Fica sim, Juliana! A gravação entra na área de encontros em até 24 horas." },
];
