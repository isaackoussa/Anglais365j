import type { Reading } from "./types";

export const READINGS: Reading[] = [
  {
    id: "r-a1-1",
    level: "A1",
    title: "Meet Emma",
    text: `Hello! My name is Emma. I'm twenty-six years old and I'm from Manchester, in England. I live in a small flat with my cat, Pixel. I'm a graphic designer and I work in an office in the city centre.

Every morning, I get up at seven. I have a coffee and some toast for breakfast. I go to work by bus. I start work at nine and I finish at five.

In the evening, I cook dinner and I watch a film or I read a book. At the weekend, I meet my friends. We often go to a café or to the park. I love my life in Manchester!`,
    glossary: [
      { en: "flat", fr: "appartement" },
      { en: "city centre", fr: "centre-ville" },
      { en: "toast", fr: "pain grillé" },
    ],
    questions: [
      { q: "Where is Emma from?", options: ["London", "Manchester", "Liverpool"], answer: 1 },
      { q: "What is her job?", options: ["Teacher", "Nurse", "Graphic designer"], answer: 2 },
      { q: "How does she go to work?", options: ["By bus", "By car", "On foot"], answer: 0 },
    ],
  },
  {
    id: "r-a1-2",
    level: "A1",
    title: "A day at the market",
    text: `It's Saturday morning. Tom and his daughter Lily go to the market. There are a lot of people. There is fruit, vegetables, cheese, bread and fish.

"Can I have some apples, please?" asks Tom. "Of course. Red or green?" says the woman. "Green, please. How much are they?" "Two pounds." Tom pays and says thank you.

Lily is hungry. She wants a cake. "Can I have a chocolate cake, Dad?" "OK, but only one!" They sit on a bench and eat. It's sunny and warm. They are happy.`,
    glossary: [
      { en: "bench", fr: "banc" },
      { en: "pounds", fr: "livres (monnaie)" },
      { en: "warm", fr: "doux, chaud" },
    ],
    questions: [
      { q: "When do they go to the market?", options: ["On Sunday", "On Saturday", "On Monday"], answer: 1 },
      { q: "What colour are the apples Tom buys?", options: ["Red", "Yellow", "Green"], answer: 2 },
      { q: "What is the weather like?", options: ["Rainy", "Sunny", "Cold"], answer: 1 },
    ],
  },
  {
    id: "r-a1-3",
    level: "A1",
    title: "My family",
    text: `I'm Carlos and this is my family. My father is called Miguel. He's a chef and he cooks very well. My mother, Ana, is a doctor. She works at the hospital and she's always busy.

I have one sister and two brothers. My sister, Sofia, is eighteen. She's a student at university. My brothers are twins! They are ten years old and they love football.

We have a dog. His name is Max. He's big and black and very friendly. On Sundays, we have a big lunch with my grandparents. It's my favourite day of the week.`,
    glossary: [
      { en: "twins", fr: "jumeaux" },
      { en: "friendly", fr: "gentil, amical" },
    ],
    questions: [
      { q: "What is Carlos's mother's job?", options: ["Chef", "Doctor", "Teacher"], answer: 1 },
      { q: "How many brothers does Carlos have?", options: ["One", "Two", "Three"], answer: 1 },
      { q: "What do they do on Sundays?", options: ["Play football", "Have a big lunch with the grandparents", "Go to the hospital"], answer: 1 },
    ],
  },
  {
    id: "r-a2-1",
    level: "A2",
    title: "A holiday to remember",
    text: `Last summer, Julie went to Scotland with her best friend, Clara. They took the train from London to Edinburgh. The journey took four and a half hours, but the views were beautiful.

In Edinburgh, they stayed in a small hotel near the castle. On the first day, they walked around the old town and visited the castle. In the evening, they tried haggis, a traditional Scottish dish. Julie loved it, but Clara didn't!

On the third day, they rented a car and drove to the Highlands. It rained a lot, but the mountains and lakes were amazing. They even saw some deer. "It was the best holiday of my life," says Julie. "I want to go back next year."`,
    glossary: [
      { en: "castle", fr: "château (fort)" },
      { en: "rented", fr: "ont loué" },
      { en: "deer", fr: "cerf(s)" },
    ],
    questions: [
      { q: "How did they travel to Edinburgh?", options: ["By plane", "By car", "By train"], answer: 2 },
      { q: "Who didn't like haggis?", options: ["Julie", "Clara", "Both of them"], answer: 1 },
      { q: "What was the weather like in the Highlands?", options: ["Sunny", "Rainy", "Snowy"], answer: 1 },
    ],
  },
  {
    id: "r-a2-2",
    level: "A2",
    title: "Working from home",
    text: `Two years ago, Mark's company decided that employees could work from home three days a week. At first, Mark was very happy. He didn't have to take the crowded train every morning, and he saved a lot of money.

But after a few months, he started to feel lonely. He missed his colleagues and their chats at the coffee machine. He also found it difficult to stop working in the evening, because his office was in his living room.

Now Mark has new habits. He goes for a walk every morning before he starts work, and he turns off his laptop at six o'clock. On Fridays, he works in a café. "It's not perfect," he says, "but I've found a good balance."`,
    glossary: [
      { en: "crowded", fr: "bondé" },
      { en: "missed", fr: "(ils lui) manquaient" },
      { en: "balance", fr: "équilibre" },
    ],
    questions: [
      { q: "How many days a week can Mark work from home?", options: ["Two", "Three", "Five"], answer: 1 },
      { q: "What was the problem after a few months?", options: ["He felt lonely", "He lost his job", "His laptop broke"], answer: 0 },
      { q: "Where does he work on Fridays?", options: ["At the office", "In a café", "In the park"], answer: 1 },
    ],
  },
  {
    id: "r-a2-3",
    level: "A2",
    title: "The new neighbour",
    text: `When Mrs Patel moved into the flat next door, nobody in the building talked to her. She was quiet and always alone. The children thought she was strange.

One cold evening in December, there was a power cut. The whole building was dark. Suddenly, someone knocked on every door. It was Mrs Patel, with candles and a big pot of hot soup. "Come to my flat," she said. "I have a gas cooker. Let's eat together!"

That night, twelve neighbours sat on her floor, ate her delicious soup and told stories until midnight. Since then, the building has a "soup night" on the first Friday of every month — and Mrs Patel is everyone's favourite neighbour.`,
    glossary: [
      { en: "power cut", fr: "coupure de courant" },
      { en: "candles", fr: "bougies" },
      { en: "gas cooker", fr: "cuisinière à gaz" },
    ],
    questions: [
      { q: "What happened one evening in December?", options: ["A fire", "A power cut", "A party"], answer: 1 },
      { q: "What did Mrs Patel bring?", options: ["Candles and soup", "A cake", "Blankets"], answer: 0 },
      { q: "When is 'soup night'?", options: ["Every Friday", "The first Friday of every month", "Every December"], answer: 1 },
    ],
  },
  {
    id: "r-b1-1",
    level: "B1",
    title: "Why do we procrastinate?",
    text: `We've all done it: you have an important task to finish, but instead you check your phone, tidy your desk or watch "just one more" video. Procrastination affects almost everyone, and it's not simply a question of laziness.

According to psychologists, we procrastinate mainly to avoid negative emotions. If a task makes us feel bored, anxious or insecure, our brain looks for something more pleasant — right now. The problem is that the relief is temporary, and the stress usually comes back even stronger.

So how can we deal with it? Experts suggest breaking big tasks into very small steps, so that starting feels easy. Another popular technique is the "two-minute rule": if something takes less than two minutes, do it immediately. Finally, be kind to yourself. Research shows that people who forgive themselves for procrastinating are less likely to do it again.`,
    glossary: [
      { en: "relief", fr: "soulagement" },
      { en: "insecure", fr: "peu sûr de soi" },
      { en: "breaking … into", fr: "diviser … en" },
    ],
    questions: [
      { q: "According to psychologists, why do we procrastinate?", options: ["Because we are lazy", "To avoid negative emotions", "Because we are tired"], answer: 1 },
      { q: "What is the 'two-minute rule'?", options: ["Take a break every two minutes", "Do immediately anything that takes less than two minutes", "Work for two minutes a day"], answer: 1 },
      { q: "What does research say about forgiving yourself?", options: ["It makes procrastination worse", "It has no effect", "It reduces future procrastination"], answer: 2 },
    ],
  },
  {
    id: "r-b1-2",
    level: "B1",
    title: "The rise of second-hand fashion",
    text: `Ten years ago, many people were embarrassed to wear second-hand clothes. Today, buying "pre-loved" fashion has become a trend, especially among young people. Apps that allow users to sell their old clothes have millions of downloads, and vintage shops are opening in cities all over the world.

There are several reasons for this change. First, second-hand clothes are cheaper, which is important when the cost of living is rising. Second, more and more people are worried about the environment. The fashion industry produces a huge amount of waste and pollution, and buying used items is a simple way to reduce your impact.

However, some experts warn that the trend has a downside. Some shoppers now buy more than ever, simply because it's cheap, and then resell items after wearing them only once. "Second-hand is great," says one sustainability researcher, "but the most sustainable piece of clothing is the one already in your wardrobe."`,
    glossary: [
      { en: "second-hand", fr: "d'occasion" },
      { en: "downside", fr: "inconvénient" },
      { en: "wardrobe", fr: "armoire, garde-robe" },
    ],
    questions: [
      { q: "How did people feel about second-hand clothes ten years ago?", options: ["Proud", "Embarrassed", "Excited"], answer: 1 },
      { q: "Which is NOT a reason given for the trend?", options: ["Lower prices", "Environmental concerns", "Better quality"], answer: 2 },
      { q: "What is the downside mentioned by experts?", options: ["Clothes are dirty", "People buy and resell too much", "Shops are closing"], answer: 1 },
    ],
  },
  {
    id: "r-b1-3",
    level: "B1",
    title: "Learning a language as an adult",
    text: `Many adults believe that it's too late to learn a new language. "Children learn so easily," they say, "but my brain isn't made for it any more." Is this true?

Not exactly. It's true that young children usually develop a better accent. But adults actually have several advantages. They can understand grammar rules, use their experience to guess meaning, and organise their learning with clear goals. Studies show that, in the first months, adults often progress faster than children.

The real secret isn't age — it's consistency. Twenty minutes a day is much more effective than three hours once a week, because our memory needs regular repetition. Reviewing words at increasing intervals, a method called "spaced repetition", helps move them into long-term memory. So, if you're reading this in English, you're already proving that it's never too late!`,
    glossary: [
      { en: "consistency", fr: "régularité" },
      { en: "guess", fr: "deviner" },
      { en: "long-term memory", fr: "mémoire à long terme" },
    ],
    questions: [
      { q: "What advantage do children usually have?", options: ["Better grammar", "A better accent", "Clearer goals"], answer: 1 },
      { q: "According to the text, what is the real secret?", options: ["Age", "Talent", "Consistency"], answer: 2 },
      { q: "What is 'spaced repetition'?", options: ["Reviewing at increasing intervals", "Studying three hours a week", "Repeating words aloud"], answer: 0 },
    ],
  },
  {
    id: "r-b2-1",
    level: "B2",
    title: "The four-day week experiment",
    text: `In 2022, dozens of British companies took part in what was then the world's largest trial of a four-day working week. Employees kept 100% of their salary in exchange for a commitment to maintain 100% of their productivity — while working only 80% of their usual hours.

The results turned out to be striking. The vast majority of participating firms decided to continue with the scheme once the trial had ended. Staff reported lower levels of stress and burnout, and fewer people took sick days. Perhaps surprisingly, revenue remained broadly stable, and several companies even saw it increase.

Critics, however, point out that the trial relied on volunteers: firms that signed up were likely to be those most suited to the model. Implementing a shorter week in hospitals, schools or factories, where output is closely tied to hours worked, would be considerably more challenging. Nevertheless, the experiment has shifted the debate. The question is no longer whether a four-day week can work, but where — and for whom.`,
    glossary: [
      { en: "trial", fr: "essai, expérimentation" },
      { en: "striking", fr: "frappant" },
      { en: "output", fr: "production, rendement" },
    ],
    questions: [
      { q: "What did employees have to promise?", options: ["To work longer days", "To maintain their productivity", "To accept a lower salary"], answer: 1 },
      { q: "What happened to revenue in most firms?", options: ["It fell sharply", "It remained broadly stable", "It doubled"], answer: 1 },
      { q: "What is the main criticism of the trial?", options: ["It was too short", "It relied on volunteer companies", "Employees didn't like it"], answer: 1 },
    ],
  },
  {
    id: "r-b2-2",
    level: "B2",
    title: "Can we trust what we see online?",
    text: `A few years ago, a convincing fake video required a studio, expensive equipment and considerable technical skill. Today, anyone with a smartphone and the right app can produce images and recordings that are almost impossible to distinguish from reality.

This poses a serious threat to public trust. Fabricated videos of politicians saying things they never said can spread across social media within hours, long before fact-checkers have had the chance to respond. Yet the danger may be subtler than simply believing false information. As fakes become widespread, people may start to doubt everything — including genuine evidence. Researchers call this the "liar's dividend": when anything could be fake, dishonest people can dismiss real recordings as forgeries.

So what can be done? Technology companies are developing tools that label AI-generated content, and some governments are introducing legislation. But experts agree that the most effective defence is education. Checking sources, pausing before sharing and asking "who benefits from me believing this?" are habits that everybody, not just journalists, will need to develop.`,
    glossary: [
      { en: "fabricated", fr: "fabriqué, inventé" },
      { en: "dismiss", fr: "écarter, rejeter" },
      { en: "forgeries", fr: "contrefaçons, faux" },
    ],
    questions: [
      { q: "What is the 'liar's dividend'?", options: ["Money earned from fake news", "The ability to dismiss real evidence as fake", "A tool to detect fakes"], answer: 1 },
      { q: "According to experts, what is the most effective defence?", options: ["Legislation", "Labelling tools", "Education"], answer: 2 },
      { q: "The word 'subtler' suggests the danger is…", options: ["less obvious", "less important", "more expensive"], answer: 0 },
    ],
  },
  {
    id: "r-b2-3",
    level: "B2",
    title: "The loneliness paradox",
    text: `We are more connected than at any point in history. With a few taps, we can message friends on the other side of the planet, join communities built around our most niche interests, or video-call family members every day. And yet surveys in many countries suggest that loneliness is on the rise, particularly among young adults.

How can this paradox be explained? One theory is that online interaction, while convenient, often lacks the depth of face-to-face contact. Scrolling through other people's carefully curated highlights can also leave us feeling that everyone else is having a better time. Moreover, time spent online may gradually replace, rather than complement, activities that build strong bonds: shared meals, team sports, or simply chatting with neighbours.

Some cities have started to treat loneliness as a public health issue. Initiatives range from "chatty benches", where people are encouraged to talk to strangers, to programmes that connect elderly residents with students looking for affordable housing. Their success suggests that the solution may be surprisingly simple: creating spaces where people can be together, without a screen in between.`,
    glossary: [
      { en: "niche", fr: "de niche, très spécifique" },
      { en: "curated", fr: "soigneusement sélectionné" },
      { en: "bonds", fr: "liens" },
    ],
    questions: [
      { q: "What is paradoxical about loneliness today?", options: ["It affects only old people", "It rises despite hyper-connectivity", "It is decreasing"], answer: 1 },
      { q: "What might online time replace?", options: ["Activities that build strong bonds", "Sleep", "Work"], answer: 0 },
      { q: "What is a 'chatty bench'?", options: ["A bench with Wi-Fi", "A bench where people are encouraged to talk", "A bench for students"], answer: 1 },
    ],
  },
  {
    id: "r-c1-1",
    level: "C1",
    title: "The myth of multitasking",
    text: `Few claims are made as confidently in job interviews as "I'm a great multitasker". Yet the cognitive science is remarkably consistent: with the exception of highly automated activities such as walking, the human brain does not genuinely perform two demanding tasks at once. What we call multitasking is, in reality, rapid task-switching — and every switch carries a cost.

These "switch costs" are individually tiny, often a fraction of a second, but they accumulate insidiously. Studies suggest that heavy multitaskers are, paradoxically, worse at filtering out irrelevant information than those who tend to focus on one thing at a time. Far from training the brain to handle distraction, constant switching appears to erode our capacity for sustained attention.

None of this is to say that the modern workplace can simply be redesigned around uninterrupted focus. Notifications, open-plan offices and the expectation of instant replies are deeply entrenched. But a growing number of organisations are experimenting with "deep work" blocks, meeting-free mornings and asynchronous communication. Their premise is simple, albeit counter-cultural: that doing one thing well is worth more than doing several things badly.`,
    glossary: [
      { en: "insidiously", fr: "insidieusement" },
      { en: "erode", fr: "éroder, miner" },
      { en: "entrenched", fr: "bien ancré" },
    ],
    questions: [
      { q: "According to the text, multitasking is actually…", options: ["parallel processing", "rapid task-switching", "a rare talent"], answer: 1 },
      { q: "What paradox is mentioned about heavy multitaskers?", options: ["They are more productive", "They are worse at filtering irrelevant information", "They sleep less"], answer: 1 },
      { q: "The phrase 'albeit counter-cultural' implies that the premise…", options: ["goes against prevailing norms", "is widely accepted", "is scientifically wrong"], answer: 0 },
    ],
  },
  {
    id: "r-c1-2",
    level: "C1",
    title: "Tourism's double-edged sword",
    text: `For many coastal towns and historic cities, tourism is both a lifeline and a liability. It sustains countless jobs, funds the restoration of monuments and brings a cosmopolitan energy to places that might otherwise stagnate. Yet in destinations such as Venice, Barcelona and Dubrovnik, residents have taken to the streets to protest against what has come to be known as "overtourism".

The grievances are manifold. Short-term rental platforms have driven up rents, pricing locals out of neighbourhoods their families have inhabited for generations. Traditional shops give way to souvenir outlets, and public spaces become so congested that daily life grows untenable. Ironically, the very authenticity that draws visitors is gradually hollowed out by their presence.

Policymakers have responded with an array of measures, from entry fees for day-trippers to caps on cruise ships and restrictions on new holiday lets. Whether such interventions can strike a sustainable balance remains to be seen. What is increasingly clear, however, is that the question is not whether tourism should be managed, but how to ensure that those who live in a place are not treated as mere extras in someone else's holiday.`,
    glossary: [
      { en: "lifeline", fr: "bouée de sauvetage" },
      { en: "grievances", fr: "griefs, doléances" },
      { en: "hollowed out", fr: "vidé de sa substance" },
    ],
    questions: [
      { q: "Why does the author call tourism both a 'lifeline and a liability'?", options: ["It brings benefits and problems", "It is only harmful", "It is only beneficial"], answer: 0 },
      { q: "What irony is highlighted in the second paragraph?", options: ["Tourists destroy the authenticity that attracts them", "Locals love souvenir shops", "Rents are falling"], answer: 0 },
      { q: "'Mere extras' suggests that residents risk being…", options: ["the main attraction", "treated as background figures", "paid by tourists"], answer: 1 },
    ],
  },
  {
    id: "r-c1-3",
    level: "C1",
    title: "Should machines make moral decisions?",
    text: `As artificial intelligence moves from recommending films to screening job applications, approving loans and assisting in medical diagnoses, a once-theoretical question has acquired pressing practical relevance: to what extent should we delegate decisions with moral weight to machines?

Proponents argue that algorithms, unlike humans, do not tire, hold grudges or succumb to mood. In principle, a well-designed system could apply criteria more consistently than the overworked professionals it assists. Critics counter that consistency is not the same as fairness. A model trained on historical data may faithfully reproduce the very biases embedded in that data, while lending them an unwarranted aura of objectivity.

Perhaps the more fruitful question is not whether machines should decide, but how responsibility should be shared between them and us. Transparency about how systems reach their conclusions, meaningful avenues for appeal, and a clear line of human accountability are increasingly regarded as non-negotiable. Technology may well sharpen our judgement; the danger lies in allowing it to replace the obligation to exercise judgement at all.`,
    glossary: [
      { en: "pressing", fr: "pressant, urgent" },
      { en: "hold grudges", fr: "garder rancune" },
      { en: "unwarranted", fr: "injustifié" },
    ],
    questions: [
      { q: "What do proponents of algorithmic decisions emphasise?", options: ["Their creativity", "Their consistency", "Their low cost"], answer: 1 },
      { q: "What is the critics' main concern?", options: ["Machines are too slow", "Models may reproduce historical biases", "Humans will lose their jobs"], answer: 1 },
      { q: "According to the final paragraph, the real danger is…", options: ["giving up our obligation to judge", "using technology at all", "a lack of data"], answer: 0 },
    ],
  },
];
