# Речь на защите BA: простой вариант

Презентация: https://claude.ai/artifact/TtYdwN51ke3VLoZECGBt54 (этот же текст лежит в заметках к слайдам).

**Слот 10 минут:** доклад и вопросы комиссии вместе. Доклад около 5 минут, на вопросы остаётся около 5.

**Слов в речи:** 562. По расчёту это около 5 минут, точное время покажет репетиция с таймером.

**Как читать:** одна строка — одно предложение. После каждой строки короткая пауза.

**Слайды:** каждая часть речи относится к одному слайду и идёт в том же порядке, что и на нём. Заголовок части — это заголовок слайда. Номер слайда указан как в PowerPoint.

**Тезисы:** тезис каждого слайда выделен жирным. Если забудете текст, скажите тезис и переходите дальше.

**Слова:** сложные слова в речи заменены простыми. На слайдах термины из BA остались, их читать вслух не нужно.

**Как репетировать:** прочитайте вслух с таймером 3–4 раза. Потом говорите, глядя только на слайды. Если выходит дольше 5 минут, пропустите строку «The service must work» на слайде 8 и строку «And none of them» на слайде 5.

В презентации 9 слайдов: титульный и 8 основных.

## Речь

### Слайд 1: Real-Time Collaborative Code Editing Platform Based on CRDT [15 с]

> Hello, everyone.  
> My name is Artsiom Harminovich, and my supervisor is Maksym Svynarenko.  
> **Today I will talk about a platform for editing code together in real time, based on CRDT.**  

### Слайд 2: Hypothesis: a live session needs too many tools [35 с]

> Let's start with the problem.  
> **My idea is that students and small teams need too many tools to work on code together.**  
> So they can lose time and work.  
> And working apart is normal today.  
> In a Stack Overflow poll, 80 percent of developers work from home, at least some days.  
> That number is not proof, so I plan a test with five pairs of users.  

### Слайд 3: Goal: first shared edit in one minute, no lost edits [20 с]

> **My goal is that a new person can start to edit in one minute, and no edits are lost.**  
> This is for students and mentors in live sessions.  
> You can also see my five tasks, the object and the subject.  

### Слайд 4: Today: the team loses time and edits [50 с]

> **Today, a team can lose time and edits.**  
> For example, a student has a bug and calls a friend for help.  
> The student shares the screen, but the friend cannot type.  
> So the friend gets the code, installs it and runs it, and this takes time.  
> Then someone merges the changes by hand, and edits can get lost.  
> And if the connection stops, the session stops too.  
> A friend with no account needs at least 105 seconds to make the first edit.  
> This number is from a time model.  

### Слайд 5: Analogs: nobody combines all three [35 с]

> **I compared five products, and they solve only part of this.**  
> In Live Share and Replit, a guest needs an account to edit.  
> CodeShare needs no account, but it is one file for one day.  
> And none of them can merge offline work.  
> So nobody gives all three together: easy entry, a real project and offline work.  

### Слайд 6: Vision: one browser workspace, no lost edits [40 с]

> **So here is my plan: one browser workspace for code, documents, a whiteboard and chat.**  
> I have four KPIs to check it.  
> First, time: a new person starts to edit in 60 seconds, not 105.  
> Second, tools: a session needs three tools, not five, and later only one.  
> Third, lost work: no session loses work.  
> And fourth, typing: 90 percent of people type in the shared file, not 50.  
> A test with users will give the real numbers.  

### Слайд 7: Seven epics, 27 stories, nine of them Must [35 с]

> What must the platform do?  
> **I wrote seven epics and 27 user stories.**  
> Nine stories are Must.  
> Here is one chain.  
> The problem is a slow start, so the goal is a fast start.  
> The KPI is one minute, the epic is access, and the story is join by link.  
> So the friend just opens the link, enters a name and starts to edit.  

### Слайд 8: Every quality requirement has a number [25 с]

> **The platform must also work well, and I can check this with numbers.**  
> For example, an edit must arrive in 100 milliseconds, even with 50 editors.  
> The service must work 99 percent of the month.  
> For GDPR, guests give no e-mail, and users can delete their data.  

### Слайд 9: Concept: one workspace, chosen from three options [45 с]

> And last, the concept.  
> **I compared three options and chose my own workspace.**  
> You can see it in this picture.  
> It costs the most, but only this option has easy entry, a real project and offline work.  
> There are three main risks.  
> First, user code can be unsafe, so it runs in a closed sandbox.  
> Second, GitHub has limits, so each user works with their own token.  
> And third, the deadline is fixed, so I use MoSCoW and drop Could stories first.  
> Thank you, and I am ready for your questions.  

## Перевод

**Слайд 1: Real-Time Collaborative Code Editing Platform Based on CRDT.** Здравствуйте. Меня зовут Artsiom Harminovich, мой руководитель — Maksym Svynarenko. Сегодня я расскажу о платформе для совместного редактирования кода в реальном времени на основе CRDT.

**Слайд 2: Hypothesis: a live session needs too many tools.** Начнём с проблемы. Моя идея в том, что студентам и небольшим командам нужно слишком много инструментов, чтобы вместе работать над кодом. Поэтому они могут терять время и работу. А работать порознь сегодня нормально. В опросе Stack Overflow 80 процентов разработчиков работают из дома хотя бы в некоторые дни. Это число не доказательство, поэтому я планирую проверку с пятью парами пользователей.

**Слайд 3: Goal: first shared edit in one minute, no lost edits.** Моя цель в том, чтобы новый человек мог начать править за одну минуту и правки не терялись. Это для студентов и наставников в живых сессиях. Здесь также видны пять моих задач, объект и предмет.

**Слайд 4: Today: the team loses time and edits.** Сегодня команда может терять время и правки. Например, у студента ошибка в коде, и студент звонит другу за помощью. Студент показывает экран, но друг не может печатать. Поэтому друг получает код, устанавливает его и запускает, и на это уходит время. Потом кто-то вручную объединяет изменения, и правки могут потеряться. А если обрывается связь, останавливается и сессия. Другу без аккаунта нужно минимум 105 секунд, чтобы сделать первую правку. Это число из модели времени.

**Слайд 5: Analogs: nobody combines all three.** Я сравнил пять продуктов, и они решают только часть этого. В Live Share и Replit гостю для правки нужен аккаунт. CodeShare работает без аккаунта, но это один файл на один день. И ни один из них не может объединить работу без сети. Так что никто не даёт все три вещи вместе: лёгкий вход, настоящий проект и работу без сети.

**Слайд 6: Vision: one browser workspace, no lost edits.** Вот мой план: одно рабочее пространство в браузере для кода, документов, доски и чата. У меня четыре KPI, чтобы это проверить. Первый — время: новый человек начинает править за 60 секунд, а не за 105. Второй — инструменты: сессии нужно три инструмента, а не пять, а позже только один. Третий — потеря работы: ни одна сессия не теряет работу. И четвёртый — ввод: 90 процентов людей печатают в общем файле, а не 50. Настоящие числа даст проверка с пользователями.

**Слайд 7: Seven epics, 27 stories, nine of them Must.** Что должна делать платформа? Я написал семь эпиков и 27 пользовательских историй. Девять историй — Must. Вот одна цепочка. Проблема — медленный старт, поэтому цель — быстрый старт. KPI — одна минута, эпик — доступ, история — вход по ссылке. Так что друг просто открывает ссылку, вводит имя и начинает править.

**Слайд 8: Every quality requirement has a number.** Платформа также должна хорошо работать, и я могу проверить это числами. Например, правка должна доходить за 100 миллисекунд, даже при 50 редакторах. Сервис должен работать 99 процентов месяца. По GDPR гости не указывают e-mail, а пользователи могут удалить свои данные.

**Слайд 9: Concept: one workspace, chosen from three options.** И последнее — концепция. Я сравнил три варианта и выбрал своё рабочее пространство. Его видно на этой схеме. Оно стоит дороже всего, но только у этого варианта есть лёгкий вход, настоящий проект и работа без сети. Есть три главных риска. Первый: код пользователей может быть небезопасным, поэтому он работает в закрытой песочнице. Второй: у GitHub есть лимиты, поэтому каждый пользователь работает со своим токеном. И третий: срок сдачи фиксирован, поэтому я использую MoSCoW и первыми убираю истории Could. Спасибо, готов ответить на ваши вопросы.

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
| merge, merges | мёрдж, МЁР-джиз |
| token | ТОУ-кен |
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
| estimate | оценка | from a model |
| baseline | исходное значение | today's number |
| vision | видение | my plan |
| analogs | аналоги | other products |
| survey, questionnaire | опрос, анкета | a poll |
| legitimate interest | законный интерес | our interest in security |

## Ответы на вопросы комиссии

На вопросы остаётся около 5 минут из 10. Скажите короткий ответ и остановитесь. Если вопрос про таблицу,
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

> It is not proved yet.  
> Three sources support it, but none looks at live sessions.  
> So I plan a poll and a test with five pairs of users.  

**What if the test shows that your idea is wrong?**
(Что, если проверка покажет, что идея неверна?)

> Then the plan changes.  
> The rule for this is in my document, written before the data.  

**How will you run the test?**
(Как вы проведёте проверку?)

> Five pairs of new users do the same task two times: with their usual tools and on my platform.  
> In each run, one connection stops for 30 seconds.  

**Where does the 80 percent come from?**
(Откуда взялись 80 процентов?)

> From the Stack Overflow poll of 2024, with about 55 thousand answers.  
> 38 percent never work in an office, and 42 percent work there only on some days.  

**Where do the 105 seconds come from?**
(Откуда взялись 105 секунд?)

> From KLM, a known time model that adds up each small step.  
> It counts an expert with no mistakes, so real people need more.  
> The full count is in Appendix D.  

**How is your solution better than the analogs?**
(Чем ваше решение лучше аналогов?)

> No other product gives all three: entry by link, a real project and offline work.  

**Which five products did you compare?**
(Какие пять продуктов вы сравнили?)

> Live Share, Replit, CodeShare, a Yjs demo and Excalidraw.  
> The full table is in chapter one.  

**What are the three options?**
(Какие три варианта вы сравнили?)

> Today's tools, open-source demos and my own workspace.  
> Only my own workspace gives all three, but it costs the most.  

**Why these KPIs, and how will you measure them?**
(Почему такие KPI и как вы их измерите?)

> Each KPI comes from one problem: slow start, many tools, lost work and one person typing.  
> One test gives the numbers for today's tools and for my platform.  

**Why three tools and not one in the first release?**
(Почему в первом выпуске три инструмента, а не один?)

> Chat, documents and the whiteboard are Should stories.  
> So the first release still needs a chat tool and a whiteboard.  

**Why is offline editing a Must story?**
(Почему работа без сети — это Must?)

> If the connection stops, people can lose work.  
> In a poll in England, 52 percent of students said a bad connection was a problem for their learning.  
> If less than one in three people have breaks, this story moves to Should.  

**Why 100 milliseconds?**
(Почему 100 миллисекунд?)

> Nielsen says that a reaction in 100 milliseconds feels instant.  

**What stays outside the project, and why?**
(Что осталось вне проекта и почему?)

> Voice and video calls, a debugger, private GitHub projects and a full Git tool.  
> Teams already have a call tool, and my goal does not need the others.  

**Which stories are Must? What will you drop if time is short?**
(Какие истории Must? Что уберёте, если не хватит времени?)

> Nine stories: access, editing together, offline work and the file tree.  
> If time is short, I drop Could stories first, then Should stories.  

**What personal data do you process, and on what legal basis?**
(Какие персональные данные вы обрабатываете и на каком основании?)

> E-mail, name, password hash, IP address in logs, and the text in files and chat.  
> Guests give only a name.  
> The basis is the contract, and for security logs, our interest in security.  

**What is the riskiest part, and what do you do about it?**
(Что самое рискованное и что вы с этим делаете?)

> My idea can be wrong, so the test comes first.  
> The deadline is fixed, so I use MoSCoW.  
> And user code runs in a closed sandbox with no network.  

**What is CRDT?**
(Что такое CRDT?)

> It is a way to keep many copies of one text.  
> People edit at the same time, also offline, and all copies become the same by themselves.  

**Why CRDT? Your requirements do not name it.**
(Почему CRDT? В требованиях его нет.)

> My stories say what is needed, and the design part says how.  
> In my test, OT and CRDT had the same speed, but CRDT makes offline work easier.  

**You already have a prototype. Are these real requirements?**
(У вас уже есть прототип. Это настоящие требования?)

> This risk is in my risk table.  
> So each story links to a goal or to the law, and the test can still change the list.  

**Did you use AI in this work?**
(Вы использовали ИИ в этой работе?)

> Yes, I used Claude, an AI assistant.  
> It helped me with the English text, the sources and the code.  
> This is in the Statements part, and I can explain every choice.  

**Чтобы выиграть пару секунд:**

> Good question.  
> One moment, please. Let me open the slide.  

**Если не поняли вопрос:**

> Sorry, could you repeat the question, please?  
> Do you mean …? (и повторите вопрос своими словами)  
