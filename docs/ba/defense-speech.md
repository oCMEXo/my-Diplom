# Текст выступления на защите BA (5 минут, английский A2 — B1)

Презентация: https://claude.ai/artifact/TtYdwN51ke3VLoZECGBt54 (тот же текст лежит в заметках к слайдам).

**Слот 15 минут:** 5 минут доклад, остальное — вопросы комиссии. Речь рассчитана на 4 мин 15 с
(около 480 слов): так остаётся запас на волнение, паузы и переключение слайдов. В квадратных скобках —
сколько секунд занимает слайд. Говорите по 9 основным слайдам; 6 запасных в PowerPoint скрыты из показа
и нужны только для ответов на вопросы.

Как репетировать: прочитайте вслух с таймером 3–4 раза. Потом говорите, глядя только на слайды:
цифры на слайдах подскажут, о чём говорить дальше. Если всё равно выходит больше 4,5 минуты, не
торопитесь, а пропустите два последних предложения на слайде 2 (object и subject написаны на слайде).

## Речь

### Титульный слайд [15 с]

> Hello, everyone. My name is Artsiom Harminovich. My topic is a real-time platform for editing code
> together, based on CRDT. My supervisor is Maksym Svynarenko.

Здравствуйте. Меня зовут Artsiom Harminovich. Моя тема — платформа для совместного редактирования кода
в реальном времени на основе CRDT. Мой руководитель — Maksym Svynarenko.

### 1. Problem [25 с]

> First, the problem. Many developers do not work in one room. In the Stack Overflow survey of 2024,
> eighty percent work remotely or in a hybrid mode. To write code together, they need many separate
> tools, and each tool needs its own invitation.

Сначала проблема. Многие разработчики работают не в одной комнате. В опросе Stack Overflow 2024 года
80% работают удалённо или гибридно. Чтобы писать код вместе, им нужно много отдельных инструментов, и в
каждый нужно отдельное приглашение.

### 2. Goal [30 с]

> My goal is a web platform for small teams. One person sends a link, and the others open it in a
> browser. They work on code, documents and diagrams together. They install nothing and lose no edits.
> The object is team work on code. The subject is the part that software can do.

Моя цель — веб-платформа для небольших команд. Один человек отправляет ссылку, остальные открывают её в
браузере. Они вместе работают с кодом, документами и диаграммами. Ничего не устанавливают и не теряют
правки. Объект — командная работа над кодом. Предмет — та её часть, которую может делать программа.
(Пять задач видны на слайде, вслух их перечислять не нужно.)

### 3. Today [35 с]

> How does a team work today? Someone shares the screen, but only this person can type. When another
> person must edit, the code goes to GitHub. The others download it, install it and run it. Then someone
> merges the changes by hand. Here the team loses time and edits. Even in the best case, the start takes
> 1.1 to 1.7 minutes. This is an estimate, not a measurement.

Как команда работает сегодня? Кто-то показывает экран, но печатать может только он. Когда править должен
другой, код уходит на GitHub. Остальные скачивают его, устанавливают и запускают. Потом кто-то вручную
объединяет изменения. Здесь команда теряет время и правки. Даже в лучшем случае старт занимает 1,1–1,7
минуты. Это оценка, а не замер. (Заинтересованные стороны видны на слайде.)

### 4. Analogs [30 с]

> I compared five products. In Live Share, the host needs VS Code, and guests without an account can
> only read. Replit needs an account for every person. CodeShare needs no account, but it is one file for
> one day. No product has all three: easy entry, a real project and offline merge.

Я сравнил пять продуктов. В Live Share у ведущего должен быть VS Code, а гости без аккаунта могут только
читать. В Replit аккаунт нужен каждому. CodeShare работает без аккаунта, но это один файл на один день.
Ни у кого нет всех трёх вещей: лёгкого входа, настоящего проекта и слияния после работы без сети.

### 5. Vision [35 с]

> My vision is one browser workspace, opened by one link. I have four KPIs. Time to start: from 1.1 to
> 1.7 minutes to one minute or less. Tools: from five to one. Merges with conflicts: from 17 percent to
> zero. Edit delay: 100 milliseconds or less. The start values come from a model and from articles, not
> from users. Voice and video are out of scope.

Моё видение — одно рабочее пространство в браузере, которое открывается одной ссылкой. У меня четыре
KPI. Время старта: с 1,1–1,7 минуты до минуты или меньше. Инструменты: с пяти до одного. Слияния с
конфликтами: с 17% до нуля. Задержка правки: не больше 100 мс. Исходные значения взяты из модели и
статей, а не от пользователей. Голос и видео — вне рамок проекта.

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

> Last, the concept. The browser talks to an API, a sync server and a code runner. Shared files use a
> CRDT, the Yjs library. I chose CRDT, not OT: in my test both were equally fast, but CRDT also works
> offline. The top risks are unsafe code, GitHub limits and the deadline. Thank you. I am ready for your
> questions.

Последнее — концепция. Браузер работает с API, сервером синхронизации и сервисом запуска кода. Общие
файлы хранятся в CRDT, это библиотека Yjs. Я выбрал CRDT, а не OT: в моём тесте оба были одинаково
быстрыми, но CRDT ещё и работает без сети. Главные риски — небезопасный код, лимиты GitHub и срок сдачи.
Спасибо. Готов ответить на вопросы.

## Произношение

| Слово | Как сказать |
|---|---|
| CRDT | си-ар-ди-ти (по буквам) |
| OT | оу-ти |
| KPI, KPIs | кей-пи-ай, кей-пи-айз |
| GDPR | джи-ди-пи-ар |
| Yjs | уай-джей-эс |
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
| scope | скоуп |
| operator | О-пе-рей-тер |
| analysis | э-НЭ-ли-сис |
| Replit | РЕП-лит |
| 1.1 / 1.7 | one point one / one point seven |
| 2024 | twenty twenty-four |

## Ответы на типичные вопросы комиссии

На вопросы уходит около 10 минут из 15, поэтому эта часть важна не меньше речи. Вопросы взяты из
требований к защите. Говорите коротко: два-три предложения, потом остановитесь. Если вопрос про
таблицу, откройте нужный запасной слайд (в PowerPoint во время показа: номер слайда и Enter).

| Вопрос | Запасной слайд |
|---|---|
| Откуда цифры, как измерите KPI | 11 — baselines and checks |
| Сравнение с аналогами | 10 — full comparison |
| Какие истории Must, что вне проекта | 12, 13 — backlog |
| Самый опасный риск | 14 — risk register |
| Главный сценарий | 15 — UC-1 |

**How did you make sure the problem is real?**
> The problem comes from three sources. The Stack Overflow survey shows that 80% work remotely or
> hybrid. A study by Brun and others shows that 17% of merges had conflicts. And I modelled the process
> of today and estimated the start time. I did not run my own survey yet. The questionnaire is ready,
> and a pilot will check the numbers.

(Проблема подтверждена тремя источниками: опросом Stack Overflow, исследованием Brun et al. и моделью
текущего процесса. Своего опроса ещё не было; анкета готова, цифры проверит пилот.)

**How is your solution better than the analogs?**
> Live Share needs VS Code, and guests can only read. Replit needs an account for everyone. CodeShare is
> one file for one day. My platform gives all three: entry by link with only a name, a real project with
> roles, and offline merge.

**Why these KPIs, and how will you measure them?**
> Each KPI comes from one problem: slow start, many tools, lost edits and only one person typing. KPI-1
> and KPI-2 I will measure in a pilot with five pairs of people. KPI-3 and KPI-4 I measure with
> automated tests. The tests are done, the pilot is not done yet.

**What stays outside the project, and why?**
> Voice and video calls, a debugger, private repositories and a full Git client. Voice and video are a
> big separate system, and teams already have a call tool. They do not help to answer my research
> question.

**Which stories are Must? What will you drop if time is short?**
> Nine stories are Must: access, editing together, offline merge and the file tree. Without them there
> is no product. If time is short, I drop Could stories first, then Should stories. In my prototype all
> Must stories are done, and 43 end-to-end tests check them.

**What personal data do you process, and on what legal basis?**
> The e-mail and name of users, only a name for guests, password hashes, IP addresses in logs, and what
> people write in files and chat. The basis is the contract for account data and legitimate interest
> for security logs. A user can delete the account and the data.

**What is the riskiest part, and what do you do about it?**
> Running user code on the server. The code runs in a Docker container without network, with limits for
> memory, CPU and time. A public server asks for an access code, and the operator can turn running off.

**Did you use AI in this work?**
> Yes, I used Claude as an assistant: for the English text, for checking sources and for help with the
> code. I checked the content, and I can explain every decision.

(Этот ответ должен совпадать с тем, что написано в разделе Statements вашего документа.)

**Если не поняли вопрос:**
> Sorry, could you repeat the question, please?

> Do you mean …? (и повторите вопрос своими словами)
