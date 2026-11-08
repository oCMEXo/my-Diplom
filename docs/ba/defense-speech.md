# Речь на защите BA: простой вариант

Презентация: https://claude.ai/artifact/TtYdwN51ke3VLoZECGBt54 (этот же текст лежит в заметках к слайдам).

**Слот 10 минут:** доклад и вопросы комиссии вместе. Доклад около 5,5 минуты, на вопросы остаётся около 4,5.

**Слов в речи:** 634. По расчёту это около 5,5 минуты, точное время покажет репетиция с таймером.

**Как читать:** одна строка — одно предложение. После каждой строки короткая пауза.

**Слайды:** каждая часть речи относится к одному слайду и идёт в том же порядке, что и на нём. Заголовок части — это заголовок слайда. Номер слайда указан как в PowerPoint.

**Тезисы:** у каждого слайда один тезис, он звучит в речи слово в слово. Если забудете текст, скажите тезис и переходите к следующему слайду.

**Слова:** сложные слова в речи заменены простыми. На слайдах термины из BA остались, их читать вслух не нужно.

**Как репетировать:** прочитайте вслух с таймером 3–4 раза. Потом говорите, глядя только на слайды. Если нужно короче, пропустите строки «Easy means» и «Stable means» на слайде 8 и «Voice and video» на слайде 6: эти числа и списки видны на слайдах.

В презентации 9 слайдов: титульный и 8 основных.

## Речь

### Слайд 1: Real-Time Collaborative Code Editing Platform Based on CRDT [15 с]

**Тезис:** Today I will show my plan for a real-time platform for editing code together, based on CRDT.

> Hello, everyone.  
> My name is Artsiom Harminovich.  
> Today I will show my plan for a real-time platform for editing code together, based on CRDT.  
> My supervisor is Maksym Svynarenko.  

### Слайд 2: Hypothesis: a live session needs too many tools [40 с]

**Тезис:** My idea is that a live session, when people edit code together, needs too many tools.

> So what is the problem?  
> My idea is that a live session, when people edit code together, needs too many tools.  
> In a Stack Overflow poll from 2024, 80 percent of developers do not work only in an office.  
> So many people work apart, but this number does not show the problem.  
> Students and small teams may lose time and work.  
> This is not proved yet, so I plan a test with five pairs of new users.  

### Слайд 3: Goal: first shared edit in one minute, no lost edits [20 с]

**Тезис:** The first shared edit in one minute, and no lost edits.

> And what is my goal?  
> The first shared edit in one minute, and no lost edits.  
> This is for live sessions of students and mentors.  
> My five tasks, the object and the subject are on the slide.  

### Слайд 4: Today: the team loses time and edits [45 с]

**Тезис:** But today a team can lose time and edits.

> But today a team can lose time and edits.  
> Imagine a student with a bug who calls a friend and shares the screen.  
> The friend cannot type, so the student sends the code.  
> The friend downloads, installs and runs it, and this takes time.  
> Then someone joins the changes by hand, and edits can get lost.  
> If the connection stops, the session stops.  
> A known time model adds up each small step.  
> It says that a partner with no account needs at least 105 seconds for the first edit.  

### Слайд 5: Analogs: nobody combines all three [35 с]

**Тезис:** Of the five I compared, none has easy entry, a real project and offline work together.

> Can other products solve this?  
> Of the five I compared, none has easy entry, a real project and offline work together.  
> Live Share and Replit have many files and roles, but a guest needs an account to edit.  
> CodeShare needs no account, but it is one file for one day.  
> And none of them joins edits by itself after a connection break.  

### Слайд 6: Vision: one browser workspace, no lost edits [50 с]

**Тезис:** So my plan is one browser workspace.

> So my plan is one browser workspace.  
> Four KPIs will show if it works.  
> First, time from the invitation to the first edit: 105 seconds from the model, down to 60.  
> Second, tools in one session: from five to three, and to one in the full release.  
> Third, sessions with lost work: zero.  
> Fourth, shared typing: today only one of two people types, and the target is at least 90 percent.  
> A test with users will check all four.  
> Voice and video stay out, because teams already have a call tool.  

### Слайд 7: Seven epics, 27 stories, nine of them Must [45 с]

**Тезис:** To get there, I have seven epics and 27 user stories.

> To get there, I have seven epics and 27 user stories.  
> Each story comes from a goal or from the law, or other stories need it.  
> Nine are Must, because without them there is no product.  
> Here is one chain.  
> The problem is a slow start, so the goal is a fast start.  
> The KPI is one minute, the epic is access, and the story is join by link.  
> Remember the friend?  
> The friend just opens the link, enters a name and edits.  

### Слайд 8: Every quality requirement has a number [35 с]

**Тезис:** Each quality rule also has a number, so I can check it.

> Each quality rule also has a number, so I can check it.  
> Fast means an edit gets to others in 100 milliseconds, with 50 editors.  
> Stable means the service works at least 99 percent of the month.  
> Easy means the first guest edit in 60 seconds, with no help.  
> For GDPR, the legal basis is the contract.  
> Guests give no e-mail, and users can delete their data.  

### Слайд 9: Concept: one workspace, chosen from three options [50 с]

**Тезис:** I chose my own workspace, and this picture shows it.

> Last, I compared three options: today's tools, open-source demos and my own workspace.  
> I chose my own workspace, and this picture shows it.  
> It costs the most to build.  
> But only this option gives easy entry, a real project and offline work.  
> There are three main risks.  
> Unsafe user code?  
> It will run in a closed sandbox with no network.  
> GitHub limits?  
> The system will use the token of the user, and it will not store it.  
> Too much work for the deadline?  
> With MoSCoW, I will drop Could stories first.  
> Thank you.  
> I am ready for your questions.  

## Перевод

**Слайд 1: Real-Time Collaborative Code Editing Platform Based on CRDT.** Здравствуйте. Меня зовут Artsiom Harminovich. Сегодня я покажу свой план платформы для совместного редактирования кода в реальном времени на основе CRDT. Мой руководитель — Maksym Svynarenko.

**Слайд 2: Hypothesis: a live session needs too many tools.** Так в чём проблема? Моя идея в том, что для живой сессии, когда люди вместе правят код, нужно слишком много инструментов. В опросе Stack Overflow за 2024 год 80 процентов разработчиков работают не только в офисе. Значит, многие работают порознь, но это число не показывает саму проблему. Студенты и небольшие команды могут терять время и работу. Это ещё не доказано, поэтому я планирую проверку с пятью парами новых пользователей.

**Слайд 3: Goal: first shared edit in one minute, no lost edits.** А какая у меня цель? Первая совместная правка за одну минуту, и никаких потерянных правок. Это для живых сессий студентов и наставников. Пять задач, объект и предмет — на слайде.

**Слайд 4: Today: the team loses time and edits.** Но сегодня команда может терять время и правки. Представьте студента с ошибкой в коде, который звонит другу и показывает экран. Друг не может печатать, поэтому студент отправляет код. Друг скачивает его, устанавливает и запускает, и на это уходит время. Потом кто-то вручную объединяет изменения, и правки могут потеряться. Если обрывается связь, останавливается и сессия. Известная модель времени складывает каждый маленький шаг. По ней партнёру без аккаунта нужно минимум 105 секунд на первую правку.

**Слайд 5: Analogs: nobody combines all three.** Могут ли это решить другие продукты? Из пяти, которые я сравнил, ни у одного нет вместе лёгкого входа, настоящего проекта и работы без сети. В Live Share и Replit есть много файлов и роли, но гостю для правки нужен аккаунт. CodeShare работает без аккаунта, но это один файл на один день. И ни один из них сам не объединяет правки после обрыва связи.

**Слайд 6: Vision: one browser workspace, no lost edits.** Итак, мой план — одно рабочее пространство в браузере. Четыре KPI покажут, работает ли это. Первый — время от приглашения до первой правки: 105 секунд по модели, снижаем до 60. Второй — инструменты в одной сессии: с пяти до трёх, а в полном релизе до одного. Третий — сессии с потерянной работой: ноль. Четвёртый — совместный ввод: сегодня печатает только один из двух, цель — минимум 90 процентов. Проверка с пользователями проверит все четыре. Голос и видео остаются вне проекта, потому что у команд уже есть инструмент для звонков.

**Слайд 7: Seven epics, 27 stories, nine of them Must.** Чтобы прийти к этому, у меня есть семь эпиков и 27 пользовательских историй. Каждая история идёт от цели или от закона, либо она нужна другим историям. Девять из них — Must, потому что без них нет продукта. Вот одна цепочка. Проблема — медленный старт, поэтому цель — быстрый старт. KPI — одна минута, эпик — доступ, история — вход по ссылке. Помните друга? Друг просто открывает ссылку, вводит имя и правит.

**Слайд 8: Every quality requirement has a number.** У каждого правила качества тоже есть число, поэтому я могу его проверить. Быстро — значит, правка доходит до других за 100 миллисекунд при 50 редакторах. Стабильно — значит, сервис работает минимум 99 процентов месяца. Просто — значит, первая правка гостя за 60 секунд, без помощи. По GDPR правовое основание — договор. Гости не указывают e-mail, а пользователи могут удалить свои данные.

**Слайд 9: Concept: one workspace, chosen from three options.** И последнее: я сравнил три варианта — сегодняшние инструменты, открытые демо и своё рабочее пространство. Я выбрал своё рабочее пространство, его показывает эта схема. Его дороже всего создать. Но только этот вариант даёт лёгкий вход, настоящий проект и работу без сети. Есть три главных риска. Небезопасный код пользователей? Он будет работать в закрытой песочнице без сети. Лимиты GitHub? Система будет использовать токен пользователя и не будет его хранить. Слишком много работы для срока сдачи? С MoSCoW я первыми уберу истории Could. Спасибо. Я готов ответить на ваши вопросы.

## Произношение: слова, которые нельзя заменить

| Слово | Как сказать |
|---|---|
| CRDT | си-ар-ди-ти (по буквам) |
| OT | оу-ти |
| KPI, KPIs | кей-пи-ай, кей-пи-айз |
| KLM | кей-эл-эм (по буквам) |
| GDPR | джи-ди-пи-ар |
| MoSCoW | МОС-коу |
| supervisor | СУ-пер-вай-зер |
| percent | пер-СЕНТ |
| epics | Э-пикс |
| milliseconds | МИ-ли-се-кендз |
| object, subject | ОБ-джект, САБ-джект |
| quality | КВО-ли-ти |
| poll | поул |
| imagine | и-МЭ-джин |
| invitation | ин-ви-ТЕЙ-шн |
| instant | ИН-стент |
| Stack Overflow | стэк оу-вер-ФЛОУ |
| Nielsen | НИЛ-сен |
| Replit | РЕП-лит |
| Yjs | уай-джей-эс (по буквам) |
| Excalidraw | экс-КА-ли-дро |
| 105 | one hundred and five |

## Если эти слова скажет комиссия

Они есть на слайдах и в документе. Произносить их не нужно, но надо понимать на слух.

| Комиссия скажет | Значит | Вы говорите |
|---|---|---|
| hypothesis | гипотеза | my idea |
| pilot | пилотная проверка | a test with users |
| objectives | задачи | tasks |
| requirements | требования | rules, stories |
| merge | слияние | join |
| estimate | оценка | from the model |
| baseline | исходное значение | today's number |
| vision | видение | my plan |
| analogs | аналоги | other products |
| survey, questionnaire | опрос, анкета | a poll |
| legitimate interest | законный интерес | our interest in security |

## Ответы на вопросы комиссии

На вопросы остаётся около 4,5 минуты из 10. Каждый ответ закрывает вопрос целиком: ответ, причина и где это прочитать. Скажите его и остановитесь. Если вопрос про таблицу,
вернитесь к её слайду. В PowerPoint во время показа: номер слайда и Enter.

| Вопрос | Какой слайд открыть |
|---|---|
| Цель, задачи, объект и предмет | 3 |
| Как работают сегодня | 4 |
| Сравнение с другими продуктами | 5 |
| KPI, что входит в проект | 6 |
| Эпики, истории Must, главный сценарий | 7 |
| Качество, GDPR | 8 |
| Варианты решения, риски | 9 |

**How did you make sure the problem is real?**
(Как вы убедились, что проблема реальна?)

> It is not proved yet, so I call it my idea.  
> Three sources support it: a study of pair work at a distance, a poll of students and a study of Git conflicts.  
> None of them looks at live sessions.  
> So I plan a poll and a test with five pairs of new users.  

**What if the test shows that your idea is wrong?**
(Что, если проверка покажет, что идея неверна?)

> Then the plan changes, and the rule for this is written before the data.  
> For example, the offline story can move from Must to Should.  

**How will you run the test?**
(Как вы проведёте проверку?)

> Five pairs of new users do the same small task two times: with their usual tools and on my platform.  
> Two or three pairs start with my platform, so that practice does not help one side.  
> In each run, the connection of one person stops for 30 seconds.  

**Where does the 80 percent come from?**
(Откуда взялись 80 процентов?)

> From the Stack Overflow poll of 2024, and about 55 thousand developers answered this question.  
> 38 percent never work in an office, and 42 percent work there only on some days.  

**Where do the 105 seconds come from?**
(Откуда взялись 105 секунд?)

> From KLM, a known time model that adds up each small step, like a click or a key press.  
> It is a lower limit, because it counts an expert who makes no mistakes.  
> The same model gives about 30 seconds on my platform.  
> The full count is in Appendix D.  

**How is your solution better than the analogs?**
(Чем ваше решение лучше аналогов?)

> No other product gives all three: entry by link, a project with many files and roles, and offline work.  
> You can see it in the table on slide five.  

**Which five products did you compare?**
(Какие пять продуктов вы сравнили?)

> Live Share, Replit, CodeShare, a Yjs demo and Excalidraw.  
> I tried three of them myself, and for Live Share and Replit I read the official documents.  
> The full table is in chapter one of my document.  

**What are the three options?**
(Какие три варианта вы сравнили?)

> Today's tools, open-source demos and my own workspace.  
> Today's tools cost almost nothing, but a guest with no account cannot write.  
> Demos cost more, and the parts do not fit together.  
> My own workspace costs the most, but only it gives all three.  

**Why these KPIs, and how will you measure them?**
(Почему такие KPI и как вы их измерите?)

> Each KPI comes from one problem: slow start, many tools, lost work and one person typing.  
> One test with users gives the numbers for today's tools and for my platform.  
> So both numbers come from the same test, and I can compare them.  

**Why three tools and not one in the first release?**
(Почему в первом выпуске три инструмента, а не один?)

> Chat, documents and the whiteboard are Should stories, not Must.  
> So after the first release, people use my editor, a chat tool and a whiteboard.  
> That is three tools, and with the Should stories, it is one.  

**Why is offline editing a Must story?**
(Почему работа без сети — это Must?)

> Because if the connection stops, people can lose work.  
> In a poll of students in England, 52 percent said that a bad connection was a problem for their learning.  
> This poll is not about live sessions, so I made a rule.  
> If less than one in three people have breaks, this story moves to Should.  

**Why 100 milliseconds?**
(Почему 100 миллисекунд?)

> Nielsen says that people feel a reaction in 100 milliseconds as instant.  
> So people can type together and the delay does not disturb them.  

**What stays outside the project, and why?**
(Что осталось вне проекта и почему?)

> Voice and video calls, a debugger, private GitHub projects and a full Git tool.  
> Teams already have a call tool, and my goal does not need the others.  

**Which stories are Must? What will you drop if time is short?**
(Какие истории Must? Что уберёте, если не хватит времени?)

> Nine stories: access, editing together, offline work and the file tree.  
> Without them, there is no product, so they stay.  
> If time is short, I drop Could stories first, and then Should stories.  

**What personal data do you process, and on what legal basis?**
(Какие персональные данные вы обрабатываете и на каком основании?)

> E-mail, name, password hash, the IP address in logs, and the text in files and chat.  
> Guests give only a name.  
> The basis is the contract, and for security logs, it is our interest in security.  
> A user can delete the account and the data.  

**What is the riskiest part, and what do you do about it?**
(Что самое рискованное и что вы с этим делаете?)

> First, my idea can be wrong, so the test with users comes first.  
> Second, the deadline is fixed, so I use MoSCoW.  
> Third, user code runs in a closed sandbox with no network, to keep other people safe.  

**What is CRDT?**
(Что такое CRDT?)

> It is a way to keep many copies of one text.  
> People edit their copies at the same time, also with no connection.  
> Then all copies become the same by themselves.  

**Why CRDT? Your requirements do not name it.**
(Почему CRDT? В требованиях его нет.)

> My stories say what is needed, and the design part says how.  
> In my test, OT and CRDT had the same speed on one computer.  
> But with CRDT, offline work is easier to join, so I chose it.  

**You already have a prototype. Are these real requirements?**
(У вас уже есть прототип. Это настоящие требования?)

> Yes, this risk is real, so it is in my risk table.  
> That is why each story links to a goal or to the law, and my stories name no technology.  
> And the test with users can still change my list of stories.  

**Did you use AI in this work?**
(Вы использовали ИИ в этой работе?)

> Yes, I used Claude, an AI assistant.  
> It helped me to write the English text, to check sources and to write code.  
> You can read about it in the Statements part.  
> I checked the work, and I can explain every choice.  

**Чтобы выиграть пару секунд:**

> Good question.  
> One moment, please. Let me open the slide.  

**Если не поняли вопрос:**

> Sorry, could you repeat the question, please?  
> Do you mean …? (и повторите вопрос своими словами)  
