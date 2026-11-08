# Речь на защите BA: простой вариант

Презентация: https://claude.ai/artifact/TtYdwN51ke3VLoZECGBt54 (этот же текст лежит в заметках к слайдам).

**Слот 10 минут:** доклад и вопросы комиссии вместе. Доклад около 4 минут, на вопросы остаётся около 6.

**Длина речи:** 413 слов. По расчёту это около 4 минут, запас есть, спешить не нужно.

**Как читать:** одна строка — одно предложение. После каждой строки короткая пауза.

**Как репетировать:** прочитайте вслух с таймером 3–4 раза. Потом говорите, глядя только на слайды. Если всё равно выходит больше 5 минут, пропустите строку про 99% на слайде 7.

Говорите по 9 основным слайдам. 8 запасных нужны только для вопросов, в PowerPoint они скрыты из показа.

## Речь

### Титульный слайд [15 с]

> Hello, everyone.  
> My name is Artsiom Harminovich.  
> My topic is a real-time platform for editing code together, based on CRDT.  
> My supervisor is Maksym Svynarenko.  

### 1. Problem [25 с]

> First, the problem.  
> Eighty percent of developers work remotely or in a hybrid mode.  
> But this number does not prove my problem.  
> So my problem is a hypothesis.  
> Students and small teams lose time and work when they start to edit code together.  

### 2. Goal [20 с]

> My goal has two parts.  
> The first shared edit takes one minute or less.  
> And no edits are lost.  
> This is for live sessions of students and mentors.  
> My objectives, object and subject are on the slide.  

### 3. Today [30 с]

> How do teams work today?  
> One person shares the screen.  
> Only this person can type.  
> If another person must edit, the code goes to GitHub.  
> Then someone merges the changes by hand.  
> If the connection stops, the session stops.  
> For a partner with no account, the start takes at least 105 seconds.  
> This is only my estimate.  

### 4. Analogs [25 с]

> I compared five products.  
> In Live Share, the host needs VS Code.  
> A guest with no account can only read.  
> Replit needs an account for every person.  
> CodeShare is one file for one day.  
> No product has all three: easy entry, a real project and offline merge.  

### 5. Vision [40 с]

> My vision is one workspace in the browser, opened by one link.  
> I have four KPIs.  
> One: the first shared edit in 60 seconds or less.  
> Two: from five tools to three, and later to one.  
> Three: no sessions with lost work.  
> Four: ninety percent of people type in the shared file.  
> A pilot will compare today's tools with my platform.  
> Voice and video are not in this project.  

### 6. Epics [25 с]

> I have seven epics and 27 user stories.  
> Nine stories are Must.  
> Here is one chain.  
> Problem: slow start.  
> Goal: fast start.  
> KPI: one minute.  
> Epic: access.  
> Story: join by link.  
> A guest opens the link, enters a name and edits.  

### 7. Quality and law [20 с]

> Every quality requirement has a number.  
> An edit reaches the others in 100 milliseconds or less.  
> The service works 99 percent of the month.  
> For GDPR, a guest gives only a name.  
> Every user can delete the account.  

### 8. Concept [30 с]

> Last, the concept.  
> I compared three options: existing tools, open-source demos and my own workspace.  
> Only my own workspace gives easy entry, a real project and work without a connection.  
> It costs more, so I use MoSCoW.  
> The main risks are unsafe code, GitHub limits and the deadline.  
> Thank you.  
> I am ready for your questions.  

## Перевод

**Титульный слайд.** Здравствуйте. Меня зовут Artsiom Harminovich. Моя тема — платформа для совместного редактирования кода в реальном времени на основе CRDT. Мой руководитель — Maksym Svynarenko.

**1. Problem.** Сначала проблема. 80% разработчиков работают удалённо или гибридно. Но это число не доказывает мою проблему. Поэтому моя проблема — гипотеза. Студенты и небольшие команды теряют время и работу, когда начинают вместе править код.

**2. Goal.** У моей цели две части. Первая совместная правка занимает минуту или меньше. И правки не теряются. Это для живых сессий студентов и наставников. Задачи, объект и предмет — на слайде.

**3. Today.** Как команды работают сегодня? Один человек показывает экран. Печатать может только он. Если править должен другой, код уходит на GitHub. Потом кто-то вручную объединяет изменения. Если обрывается связь, сессия останавливается. Партнёру без аккаунта на старт нужно минимум 105 секунд. Это только моя оценка.

**4. Analogs.** Я сравнил пять продуктов. В Live Share ведущему нужен VS Code. Гость без аккаунта может только читать. В Replit аккаунт нужен каждому. CodeShare — это один файл на один день. Ни у кого нет всех трёх вещей: лёгкого входа, настоящего проекта и слияния после работы без сети.

**5. Vision.** Моё видение — одно рабочее пространство в браузере, которое открывается одной ссылкой. У меня четыре KPI. Первый: первая совместная правка за 60 секунд или быстрее. Второй: с пяти инструментов до трёх, а позже до одного. Третий: нет сессий с потерей работы. Четвёртый: 90% людей печатают в общем файле. Пилот сравнит сегодняшние инструменты с моей платформой. Голоса и видео в проекте нет.

**6. Epics.** У меня семь эпиков и 27 пользовательских историй. Девять историй — Must. Вот одна цепочка. Проблема: медленный старт. Цель: быстрый старт. KPI: одна минута. Эпик: доступ. История: войти по ссылке. Гость открывает ссылку, вводит имя и правит.

**7. Quality and law.** У каждого требования к качеству есть число. Правка доходит до других за 100 мс или быстрее. Сервис работает 99% времени в месяц. По GDPR гость указывает только имя. Любой пользователь может удалить аккаунт.

**8. Concept.** Последнее — концепция. Я сравнил три варианта: готовые инструменты, открытые демо и своё рабочее пространство. Только свой вариант даёт лёгкий вход, настоящий проект и работу без связи. Он дороже, поэтому я использую MoSCoW. Главные риски — небезопасный код, лимиты GitHub и срок сдачи. Спасибо. Готов ответить на вопросы.

## Произношение

| Слово | Как сказать |
|---|---|
| CRDT | си-ар-ди-ти (по буквам) |
| OT | оу-ти |
| KPI, KPIs | кей-пи-ай, кей-пи-айз |
| GDPR | джи-ди-пи-ар |
| MoSCoW | МОС-коу |
| hypothesis | хай-ПО-те-сис |
| supervisor | СУ-пер-вай-зер |
| hybrid | ХАЙ-брид |
| remotely | ри-МОУТ-ли |
| percent | пер-СЕНТ |
| mentors | МЕН-торз |
| objectives | об-ДЖЕК-тивз |
| merges | МЁР-джиз |
| estimate | ЭС-ти-мет |
| measure | МЕ-жер |
| pilot | ПАЙ-лот |
| epics | Э-пикс |
| requirement | ри-КУАЙ-эр-мент |
| milliseconds | МИ-ли-се-кендз |
| existing | иг-ЗИС-тинг |
| deadline | ДЕД-лайн |
| survey | СЁР-вей |
| legitimate | ли-ДЖИ-ти-мет |
| Replit | РЕП-лит |
| 105 | one hundred and five |

## Ответы на вопросы комиссии

На вопросы остаётся около 6 минут из 10. Отвечайте этими короткими фразами и останавливайтесь. Если вопрос про таблицу,
откройте запасной слайд. В PowerPoint во время показа: номер слайда и Enter.

| Вопрос | Запасной слайд |
|---|---|
| Сравнение с аналогами | 10 |
| Как измерите KPI | 11 |
| Почему этот вариант решения, почему CRDT | 12 |
| Связь целей и историй, почему 3 инструмента | 13 |
| Какие истории Must, что вне проекта | 14, 15 |
| Риски | 16 |
| Главный сценарий | 17 |

**How did you make sure the problem is real?**
(Как вы убедились, что проблема реальна?)

> I am not sure yet, so I call it a hypothesis.  
> Three sources support it, but none measures live sessions.  
> A survey and a pilot will check it.  

**How is your solution better than the analogs?**
(Чем ваше решение лучше аналогов?)

> No analog gives all three: entry by link, a real project and work without a connection.  
> Here is the table.  

**Why these KPIs, and how will you measure them?**
(Почему такие KPI и как вы их измерите?)

> Each KPI comes from one problem.  
> Five pairs of new users do the same task with today's tools and with my platform.  
> So I measure both in the same way.  

**Why three tools and not one in the first release?**
(Почему в первом выпуске три инструмента, а не один?)

> Chat, documents and the whiteboard are Should stories.  
> So people still need a messenger and a whiteboard.  
> In the full release, it is one tool.  

**Why is offline editing a Must story?**
(Почему работа без сети — это Must?)

> If the connection stops, people can lose work.  
> In a poll in England, 52 percent of students said that a bad connection affected their learning.  
> If my survey shows less than one third with breaks, this story moves to Should.  

**What stays outside the project, and why?**
(Что осталось вне проекта и почему?)

> Voice and video calls, a debugger, private repositories and a full Git client.  
> Teams already have a call tool.  

**Which stories are Must? What will you drop if time is short?**
(Какие истории Must? Что уберёте, если не хватит времени?)

> Nine stories: access, editing together, work without a connection and the file tree.  
> If time is short, I drop Could stories first, then Should stories.  

**What personal data do you process, and on what legal basis?**
(Какие персональные данные вы обрабатываете и на каком основании?)

> E-mail, name, password hash, IP address in logs, and the text in files and chat.  
> Guests give only a name.  
> The basis is the contract, and legitimate interest for security logs.  

**What is the riskiest part, and what do you do about it?**
(Что самое рискованное и что вы с этим делаете?)

> My hypothesis can be wrong, so the pilot comes first.  
> The deadline is fixed, so I use MoSCoW.  
> User code runs in a closed sandbox with no network.  

**Why CRDT? Your requirements do not name it.**
(Почему CRDT? В требованиях его нет.)

> Requirements say what is needed, and the design part says how.  
> In my test, OT and CRDT were equally fast on one machine.  
> But CRDT merges offline work more easily.  

**You already have a prototype. Are these real requirements?**
(У вас уже есть прототип. Это настоящие требования?)

> This is a real risk, so it is in my risk table.  
> Each story links to a goal, and the pilot can change the backlog.  

**Did you use AI in this work?**
(Вы использовали ИИ в этой работе?)

> Yes. I used Claude, an AI assistant.  
> It helped to write the English text, to check sources and to write code.  
> This is in the Statements part.  
> I checked the content, and I can explain every decision.  

**Если не поняли вопрос:**

> Sorry, could you repeat the question, please?  
> Do you mean …? (и повторите вопрос своими словами)  
