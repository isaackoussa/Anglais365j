import type { Level } from "./types";

/** Sujets d'expression écrite par niveau. */
export const WRITING_PROMPTS: Record<Level, string[]> = {
  A1: [
    "Introduce yourself: your name, age, city, job and hobbies.",
    "Describe your family.",
    "Describe your typical day, from morning to evening.",
    "Describe your house or flat.",
    "What do you like eating? What don't you like?",
    "Describe your best friend.",
    "What do you do at the weekend?",
  ],
  A2: [
    "Tell me about your last holiday. Where did you go? What did you do?",
    "Write a message to a friend to invite them to your birthday party.",
    "Describe your job or studies. What do you like and dislike about it?",
    "What are your plans for next year?",
    "Describe a person you admire and explain why.",
    "Write about a memorable day in your childhood.",
    "Compare your city with another city you know.",
  ],
  B1: [
    "Do you think social media has more advantages or disadvantages? Give your opinion.",
    "Write an email to a hotel to complain about a problem during your stay.",
    "Describe a difficult decision you made and what happened next.",
    "If you could live in any country, where would you live and why?",
    "What is the best way to learn a foreign language? Explain your ideas.",
    "Write a short review of a film or series you watched recently.",
    "Should people work from home? Discuss the pros and cons.",
  ],
  B2: [
    "Some people say that technology makes us less social. To what extent do you agree?",
    "Write a cover letter applying for your dream job.",
    "Should governments tax sugary food and drinks? Argue your position.",
    "Describe a trend in your country and analyse its causes and consequences.",
    "Is it better to specialise early or to have broad knowledge? Discuss.",
    "Write a formal proposal to improve public transport in your city.",
    "Tourism: a blessing or a curse for local communities? Discuss.",
  ],
  C1: [
    "'Artificial intelligence will create more jobs than it destroys.' Critically evaluate this claim.",
    "Write an opinion article on whether university education should be free.",
    "To what extent should individuals be held responsible for tackling climate change?",
    "Analyse the role of failure in personal and professional growth.",
    "Write a persuasive speech arguing for a four-day working week.",
    "Is privacy still possible in the digital age? Discuss with nuance.",
    "Discuss the idea that 'the medium is the message' in today's media landscape.",
  ],
};

export const ROLEPLAYS = [
  { icon: "☕", title: "Au café", prompt: "Let's role-play: you're a barista in a busy London café and I'm a customer ordering." },
  { icon: "✈️", title: "À l'aéroport", prompt: "Let's role-play: you're an airline check-in agent and my flight has a problem." },
  { icon: "💼", title: "Entretien d'embauche", prompt: "Let's role-play a job interview: you're the recruiter for a job I'm interested in. Ask me about my experience." },
  { icon: "🏨", title: "À l'hôtel", prompt: "Let's role-play: I'm checking in at a hotel and there's an issue with my booking. You're the receptionist." },
  { icon: "🩺", title: "Chez le médecin", prompt: "Let's role-play: you're a GP and I'm a patient who feels unwell." },
  { icon: "🏠", title: "Visite d'appartement", prompt: "Let's role-play: you're a landlord showing me a flat to rent. I have questions." },
  { icon: "📞", title: "Appel au service client", prompt: "Let's role-play: I'm calling customer service because my order never arrived. You're the agent." },
  { icon: "🤝", title: "Négociation", prompt: "Let's role-play a salary negotiation: you're my manager and I'm asking for a raise." },
];
