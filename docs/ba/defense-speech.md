# Текст выступления на защите BA (5 минут, английский A2 — B1)

Презентация: https://claude.ai/artifact/TtYdwN51ke3VLoZECGBt54 (тот же текст лежит в заметках к слайдам).

**Слот 15 минут:** 5 минут доклад, остальное вопросы комиссии. Речь около 510 слов, это примерно 4,5
минуты спокойным голосом. Говорите по 9 основным слайдам. 8 запасных слайдов нужны только для вопросов,
в PowerPoint они скрыты из показа.

Как репетировать: прочитайте вслух с таймером 3–4 раза, потом говорите, глядя только на слайды. Если
выходит больше 5 минут, не торопитесь, а пропустите два последних предложения на слайде 2 (object и
subject написаны на слайде).

## Речь

### Титульный слайд [15 с]

> Hello, everyone. My name is Artsiom Harminovich. My topic is a real-time platform for editing code
> together, based on CRDT. My supervisor is Maksym Svynarenko.

Здравствуйте. Меня зовут Artsiom Harminovich. Моя тема — платформа для совместного редактирования кода
в реальном времени на основе CRDT. Мой руководитель — Maksym Svynarenko.

### 1. Problem [25 с]

> First, the problem. It is a hypothesis. Eighty percent of developers work remotely or in a hybrid
> mode. This shows that remote work is normal. It does not prove my problem. My hypothesis is this:
> students and small teams lose time and work when they start to edit the same code together.

Сначала проблема. Это гипотеза. 80% разработчиков работают удалённо или гибридно. Это показывает, что
удалённая работа стала нормой, но не доказывает мою проблему. Моя гипотеза: студенты и небольшие команды
теряют время и работу, когда начинают вместе править один код.

### 2. Goal [30 с]

> My goal is to reduce the time to the first shared edit to one minute or less, and to remove lost
> edits. This is for live sessions of students and mentors. I have five objectives, from the analysis to
> a plan for checking the result. The object is team work on code. The subject is the part that software
> can do.

Моя цель — сократить время до первой совместной правки до минуты и меньше и убрать потерю правок. Это
для живых сессий студентов и наставников. Задач пять: от анализа до плана проверки результата. Объект —
командная работа над кодом. Предмет — та её часть, которую может делать программа.

### 3. Today [35 с]

> How does a team work today? Someone shares the screen, but only this person can type. When another
> person must edit, the code goes to GitHub. The others download it, install it and run it. Then someone
> merges the changes by hand. And if the connection stops, the session stops. For a partner without an
> account, the start takes at least 105 seconds. This is an estimate, not a measurement.

Как команда работает сегодня? Кто-то показывает экран, но печатать может только он. Когда править должен
другой, код уходит на GitHub. Остальные скачивают его, устанавливают и запускают. Потом кто-то вручную
объединяет изменения. А если обрывается связь, сессия останавливается. Партнёру без аккаунта на старт
нужно минимум 105 секунд. Это оценка, а не замер.

### 4. Analogs [30 с]

> I compared five products. In Live Share, the host needs VS Code, and guests without an account can
> only read. Replit needs an account for every person. CodeShare needs no account, but it is one file for
> one day. No product has all three: easy entry, a real project and offline merge.

Я сравнил пять продуктов. В Live Share у ведущего должен быть VS Code, а гости без аккаунта могут только
читать. В Replit аккаунт нужен каждому. CodeShare работает без аккаунта, но это один файл на один день.
Ни у кого нет всех трёх вещей: лёгкого входа, настоящего проекта и слияния после работы без сети.

### 5. Vision [35 с]

> My vision is one browser workspace, opened by one link. I have four KPIs. Time to first shared edit:
> 60 seconds or less. Tools per session: from five to three in the first release, and to one in the full
> release. Sessions with lost work: zero. Shared typing: ninety percent of people. A pilot will measure
> baselines and targets with the same method. Voice and video are out of scope.

Моё видение — одно рабочее пространство в браузере, которое открывается одной ссылкой. У меня четыре
KPI. Время до первой совместной правки: 60 секунд или меньше. Инструменты: с пяти до трёх в первом
выпуске и до одного в полном. Сессии с потерей работы: ноль. Совместный ввод: 90% людей. Пилот измерит
исходные и целевые значения одним способом. Голос и видео вне рамок проекта.

### 6. Epics [30 с]

> The requirements have seven epics and 27 user stories. Nine of them are Must. Here you see the chain:
> the problem is a slow start, the goal is a fast start, the KPI is one minute, the epic is access, and
> the story is "join by link". In the key use case, a guest opens the link, enters a name and edits with
> the others.

В требованиях семь эпиков и 27 пользовательских историй, девять из них Must. Здесь видна цепочка:
проблема — медленный старт, цель — быстрый старт, KPI — одна минута, эпик — доступ, история — «войти по
ссылке». В главном сценарии гость открывает ссылку, вводит имя и правит вместе с остальными.

### 7. Quality and law [25 с]

> Every quality requirement has a number. Edits reach the others in 100 milliseconds or less, with 50
> editors. The service works 99 percent of the month. A new guest makes the first edit in 60 seconds.
> For GDPR, a guest gives only a name, and every user can delete the account.

У каждого требования к качеству есть число. Правка доходит до других не дольше чем за 100 мс при 50
редакторах. Сервис работает 99% времени в месяц. Новый гость делает первую правку за 60 секунд. По GDPR
гость указывает только имя, и любой пользователь может удалить аккаунт.

### 8. Concept [30 с]

> Last, the concept. I compared three options: joining existing tools, extending open-source demos, and
> an own workspace. Only the own workspace gives easy entry, a real project and work during a connection
> break. It costs more to build, so I use MoSCoW. The top risks are unsafe code, GitHub limits and the
> deadline. Thank you. I am ready for your questions.

Последнее — концепция. Я сравнил три варианта: объединить готовые инструменты, расширить открытые демо и
сделать своё рабочее пространство. Только свой вариант даёт лёгкий вход, настоящий проект и работу при
обрыве связи. Он дороже, поэтому я использую MoSCoW. Главные риски — небезопасный код, лимиты GitHub и
срок сдачи. Спасибо. Готов ответить на вопросы.

## Произношение

| Слово | Как сказать |
|---|---|
| CRDT | си-ар-ди-ти (по буквам) |
| OT | оу-ти |
| KPI, KPIs | кей-пи-ай, кей-пи-айз |
| GDPR | джи-ди-пи-ар |
| hypothesis | хай-ПО-те-сис |
| hybrid | ХАЙ-брид |
| remotely | ри-МОУТ-ли |
| percent | пер-СЕНТ |
| milliseconds | МИ-ли-се-кендз |
| merge, merges | мёрдж, МЁР-джиз |
| requirements | ри-КУАЙ-эр-ментс |
| epics | Э-пикс |
| stakeholders | СТЕЙК-хоул-дерз |
| estimate (сущ.) | ЭС-ти-мет |
| measurement | МЕ-жер-мент |
| objectives | об-ДЖЕК-тивз |
| baseline | БЕЙС-лайн |
| pilot | ПАЙ-лот |
| scope | скоуп |
| Replit | РЕП-лит |
| 105 | one hundred and five |

## Ответы на вопросы комиссии

На вопросы уходит около 10 минут из 15. Говорите коротко: два-три предложения, потом остановитесь. Если
вопрос про таблицу, откройте запасной слайд. В PowerPoint во время показа: номер слайда и Enter.

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
> I am not sure yet, so I call it a hypothesis. Three sources support it: a study of remote pair
> programming, a poll of students in England and a study of Git conflicts. None of them measures live
> sessions. The questionnaire is ready, and a pilot with five pairs will check it. I wrote the rule
> before the data.

(Я ещё не уверен, поэтому называю это гипотезой. Три источника её поддерживают, но живые сессии не
измеряют. Анкета готова, пилот проверит. Правило записано до данных.)

**How is your solution better than the analogs?**
> Live Share needs VS Code, and guests can only read. Replit needs an account for everyone. CodeShare is
> one file for one day. My solution gives all three: entry by link with only a name, a real project with
> roles, and work during a connection break.

**Why these KPIs, and how will you measure them?**
> Each KPI comes from one problem: slow start, many tools, lost work and only one person typing. Five
> pairs of new users do the same task with today's tools and on the platform. So baseline and target use
> the same method. The 105 seconds is only a first estimate.

**Why three tools and not one in the first release?**
> Chat, documents and the whiteboard are Should stories. With Must stories, the session still needs a
> messenger and a whiteboard. So the target is three tools first, and one tool in the full release.

**Why is offline editing a Must story?**
> A connection break can stop a session or lose work. In a poll in England, 52 percent of students said
> that a bad connection affected their learning. But no source measures live coding sessions. So I have
> a rule: if less than one third of people had a break in the last month, this story moves to Should.

**What stays outside the project, and why?**
> Voice and video calls, a debugger, private repositories and a full Git client. Voice and video are a
> big separate system, and teams already have a call tool.

**Which stories are Must? What will you drop if time is short?**
> Nine stories are Must: access, editing together, work during a connection break and the file tree.
> Without them there is no product. If time is short, I drop Could stories first, then Should stories.

**What personal data do you process, and on what legal basis?**
> The e-mail and name of users, only a name for guests, password hashes, IP addresses in logs, and what
> people write in files and chat. The basis is the contract for account data and legitimate interest
> for security logs. A user can delete the account and the data.

**What is the riskiest part, and what do you do about it?**
> For the project, the problem hypothesis and the deadline. So the pilot comes first, and I use MoSCoW.
> For other people, running user code on the server. It runs in a closed sandbox without network, with
> limits for memory, CPU and time.

**Why CRDT? Your requirements do not name it.**
> Requirements say what is needed, and the design part chooses how. The story asks for work during a
> connection break. In my test OT and CRDT were equally fast on one machine, about 10 milliseconds. But
> CRDT merges offline work more easily.

**You already have a prototype. Are these real requirements?**
> This is a real risk, so it is in my risk table. To reduce it, each story links to a goal, the
> requirements name no technologies, and the pilot can change the backlog.

**Did you use AI in this work?**
> Yes, I used Claude as an assistant: for the English text, for checking sources and for help with the
> code. This is in the Statements part of the document. I checked the content, and I can explain every
> decision.

**Если не поняли вопрос:**
> Sorry, could you repeat the question, please?

> Do you mean …? (и повторите вопрос своими словами)
