# Речь на защите BA: простой вариант

Презентация: https://claude.ai/artifact/TtYdwN51ke3VLoZECGBt54 (этот же текст лежит в заметках к слайдам).

**Слот 10 минут:** доклад и вопросы комиссии вместе. Доклад чуть больше 4 минут, на вопросы остаётся около 6.

**Слов в речи:** 465. По расчёту это чуть больше 4 минут, точное время покажет репетиция с таймером.

**Как читать:** одна строка — одно предложение. После каждой строки короткая пауза.

**Слайды:** каждая часть речи относится к одному слайду и идёт в том же порядке, что и на нём. Заголовок части — это заголовок слайда. Номер слайда указан как в PowerPoint.

**Тезисы:** тезис каждого слайда выделен жирным. Если забудете текст, скажите тезис и переходите дальше.

**Слова:** сложные слова в речи заменены простыми. На слайдах термины из BA остались, их читать вслух не нужно.

**Как репетировать:** прочитайте вслух с таймером 3–4 раза. Потом говорите, глядя только на слайды. Запас есть, спешить не нужно.

В презентации 9 слайдов: титульный и 8 основных.

## Речь

### Слайд 1: Real-Time Collaborative Code Editing Platform Based on CRDT [15 с]

> Hello, everyone.  
> I am Artsiom Harminovich, and my supervisor is Maksym Svynarenko.  
> **My topic is a real-time platform for editing code together, based on CRDT.**  

### Слайд 2: Hypothesis: a live session needs too many tools [30 с]

> **My idea is simple: people need too many tools to edit code together.**  
> A Stack Overflow poll shows that 80 percent of developers do not work only in an office.  
> That shows the background, not the problem.  
> Students and small teams may lose time and work.  
> A test with five pairs of users will check this.  

### Слайд 3: Goal: first shared edit in one minute, no lost edits [20 с]

> **My goal is the first shared edit in one minute, with no lost edits.**  
> This is for live sessions of students and mentors.  
> Here you can see my five tasks, the object and the subject.  

### Слайд 4: Today: the team loses time and edits [40 с]

> **Today, a team can lose time and edits.**  
> Imagine a student who calls a friend for help and shares the screen.  
> Only the student can type, so the friend must get the code, install it and run it.  
> Then someone puts the changes together by hand, and edits can get lost.  
> And if the connection stops, the session stops.  
> A time model shows that a new partner needs at least 105 seconds for the first edit.  

### Слайд 5: Analogs: nobody combines all three [25 с]

> **None of the five products I compared gives all three: easy entry, a real project and offline work.**  
> Live Share and Replit need an account to edit.  
> CodeShare needs no account, but it is one file for one day.  
> And none of them supports offline work.  

### Слайд 6: Vision: one browser workspace, no lost edits [35 с]

> **My plan is one workspace in the browser.**  
> Four KPIs will show if it works.  
> The first edit in 60 seconds, not 105.  
> Three tools instead of five, and one in the full release.  
> No sessions with lost work.  
> And 90 percent of people typing, not 50.  
> A test with users will check these numbers.  
> Voice and video are not in the project.  

### Слайд 7: Seven epics, 27 stories, nine of them Must [35 с]

> **The plan has seven epics and 27 user stories, and nine of them are Must.**  
> Here is one chain.  
> The problem is a slow start, so the goal is a fast start.  
> The KPI is one minute, the epic is access, and the story is join by link.  
> So the friend just opens the link, enters a name and edits.  

### Слайд 8: Every quality requirement has a number [25 с]

> **Each quality rule has a number, so I can check it.**  
> An edit gets to others in 100 milliseconds, even with 50 editors.  
> The service works 99 percent of the month.  
> For GDPR, guests give no e-mail, and users can delete their data.  

### Слайд 9: Concept: one workspace, chosen from three options [35 с]

> **From three options, I chose my own workspace.**  
> It costs the most, but only this option gives all three.  
> There are three main risks.  
> Unsafe code will run in a closed sandbox.  
> For GitHub limits, I use the user's token.  
> And for the deadline, I use MoSCoW, so I drop Could stories first.  
> Thank you.  
> I am ready for your questions.  

## Перевод

**Слайд 1: Real-Time Collaborative Code Editing Platform Based on CRDT.** Здравствуйте. Я Artsiom Harminovich, мой руководитель — Maksym Svynarenko. Моя тема — платформа для совместного редактирования кода в реальном времени на основе CRDT.

**Слайд 2: Hypothesis: a live session needs too many tools.** Моя идея проста: чтобы вместе править код, людям нужно слишком много инструментов. Опрос Stack Overflow показывает, что 80 процентов разработчиков работают не только в офисе. Это показывает фон, а не саму проблему. Студенты и небольшие команды могут терять время и работу. Это проверит тест с пятью парами пользователей.

**Слайд 3: Goal: first shared edit in one minute, no lost edits.** Моя цель — первая совместная правка за одну минуту, без потерянных правок. Это для живых сессий студентов и наставников. Здесь вы видите пять моих задач, объект и предмет.

**Слайд 4: Today: the team loses time and edits.** Сегодня команда может терять время и правки. Представьте студента, который звонит другу за помощью и показывает экран. Печатать может только студент, поэтому друг должен получить код, установить его и запустить. Потом кто-то вручную соединяет изменения, и правки могут потеряться. А если обрывается связь, останавливается и сессия. Модель времени показывает, что новому партнёру нужно минимум 105 секунд на первую правку.

**Слайд 5: Analogs: nobody combines all three.** Ни один из пяти продуктов, которые я сравнил, не даёт всех трёх вещей: лёгкого входа, настоящего проекта и работы без сети. В Live Share и Replit для правки нужен аккаунт. CodeShare работает без аккаунта, но это один файл на один день. И ни один из них не поддерживает работу без сети.

**Слайд 6: Vision: one browser workspace, no lost edits.** Мой план — одно рабочее пространство в браузере. Четыре KPI покажут, работает ли это. Первая правка за 60 секунд, а не за 105. Три инструмента вместо пяти, а в полном релизе один. Ни одной сессии с потерянной работой. И 90 процентов людей печатают, а не 50. Тест с пользователями проверит эти числа. Голоса и видео в проекте нет.

**Слайд 7: Seven epics, 27 stories, nine of them Must.** В плане семь эпиков и 27 пользовательских историй, девять из них — Must. Вот одна цепочка. Проблема — медленный старт, поэтому цель — быстрый старт. KPI — одна минута, эпик — доступ, история — вход по ссылке. Так что друг просто открывает ссылку, вводит имя и правит.

**Слайд 8: Every quality requirement has a number.** У каждого правила качества есть число, поэтому я могу его проверить. Правка доходит до других за 100 миллисекунд, даже при 50 редакторах. Сервис работает 99 процентов месяца. По GDPR гости не указывают e-mail, а пользователи могут удалить свои данные.

**Слайд 9: Concept: one workspace, chosen from three options.** Из трёх вариантов я выбрал своё рабочее пространство. Оно стоит дороже всего, но только этот вариант даёт все три вещи. Есть три главных риска. Небезопасный код будет работать в закрытой песочнице. Для лимитов GitHub я использую токен пользователя. А для срока сдачи я использую MoSCoW, поэтому первыми убираю истории Could. Спасибо. Готов ответить на ваши вопросы.

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
| merge | слияние | put together |
| estimate | оценка | from a model |
| baseline | исходное значение | today's number |
| vision | видение | my plan |
| analogs | аналоги | other products |
| survey, questionnaire | опрос, анкета | a poll |
| legitimate interest | законный интерес | our interest in security |

## Ответы на вопросы комиссии

На вопросы остаётся около 6 минут из 10. Скажите короткий ответ и остановитесь. Если вопрос про таблицу,
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
> If my poll shows breaks for less than one in three people, this story moves to Should.  

**Why 100 milliseconds?**
(Почему 100 миллисекунд?)

> Nielsen says that people feel 100 milliseconds as instant.  

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
