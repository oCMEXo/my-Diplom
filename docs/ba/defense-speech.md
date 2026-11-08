# Речь на защите BA: простой вариант

Презентация: https://claude.ai/artifact/TtYdwN51ke3VLoZECGBt54 (этот же текст лежит в заметках к слайдам).

**Слот 10 минут:** доклад и вопросы комиссии вместе. Доклад около 5 минут, на вопросы остаётся около 5.

**Длина речи:** 522 слов. По расчёту это около 5 минут, точное время покажет репетиция с таймером.

**Как читать:** одна строка — одно предложение. После каждой строки короткая пауза.

**Слайды:** каждая часть речи относится к одному слайду и идёт в том же порядке, что и на нём. Заголовок части — это заголовок слайда. Номер слайда указан как в PowerPoint; цифра в углу самого слайда на 1 меньше, потому что титульный не считается.

**Слова:** сложные слова в речи заменены простыми. На слайдах термины из BA остались, их читать вслух не нужно.

**Как репетировать:** прочитайте вслух с таймером 3–4 раза. Потом говорите, глядя только на слайды. Если выходит больше 5 минут, пропустите строку про 99% на слайде 8 и строку «And none of them» на слайде 5.

Говорите по 9 основным слайдам. 8 запасных нужны только для вопросов, в PowerPoint они скрыты из показа.

## Речь

### Слайд 1: Real-Time Collaborative Code Editing Platform Based on CRDT [15 с]

> Hello, everyone.  
> My name is Artsiom Harminovich.  
> Today I will talk about a real-time platform for editing code together, based on CRDT.  
> My supervisor is Maksym Svynarenko.  

### Слайд 2: Hypothesis: a live session needs too many tools [30 с]

> Let's start with the problem.  
> My idea is that a live session needs too many tools.  
> Eighty percent of developers do not work only in an office.  
> But this does not show my problem.  
> I think students and small teams lose time and work, and I have to test this.  

### Слайд 3: Goal: first shared edit in one minute or less, no lost edits [25 с]

> So what do I want to change?  
> The first shared edit should take one minute or less.  
> And no edits should be lost.  
> This is for live sessions of students and mentors.  
> My five tasks, the object and the subject are on the slide.  

### Слайд 4: Today: the team loses time and edits [45 с]

> Now imagine a student with a bug who calls a friend.  
> The student shares the screen, and only the student can type.  
> If the friend wants to edit, the student sends the code.  
> The friend downloads it and runs it, and this takes time.  
> Then someone joins the changes by hand, and edits can be lost.  
> And if the connection stops, the session stops too.  
> My model says that a friend with no account needs at least 105 seconds for the first edit.  

### Слайд 5: Analogs: nobody combines all three [35 с]

> There are products for this, and here are three of the five I compared.  
> In Live Share and Replit, a guest with no account cannot edit.  
> CodeShare has no accounts, but it is one file for one day.  
> And none of them joins offline work by itself.  
> So no product has all three: easy entry, a real project and offline work.  

### Слайд 6: Vision: one browser workspace, no lost edits [40 с]

> So here is my plan: one workspace in the browser for code, documents, a whiteboard and chat.  
> I have four KPIs.  
> First, time: from 105 seconds to 60 or less.  
> Second, tools: from five to three, and later to one.  
> Third, lost work: zero.  
> And fourth, typing: from half of the people to ninety percent.  
> A test with users will give the real numbers.  
> Voice, video and a debugger are not in this project.  

### Слайд 7: Seven epics, 27 stories, nine of them Must [35 с]

> In the project, I have seven epics and 27 user stories, and nine of them are Must.  
> Here is one chain.  
> The problem is a slow start, so the goal is a fast start.  
> The KPI is one minute, the epic is access, and the story is join by link.  
> For the guest, it is simple: open the link, enter a name and edit together.  

### Слайд 8: Every quality requirement has a number [25 с]

> Each quality rule has a number.  
> For example, an edit gets to the others in 100 milliseconds or less.  
> The service works 99 percent of the month.  
> For GDPR, a guest gives only a name, and every user can delete the data.  

### Слайд 9: Concept: one workspace, chosen from three options [40 с]

> And last, the concept.  
> In this picture, all users work in one place.  
> I chose it from three options.  
> Only my own workspace gives easy entry, a real project and offline work.  
> There are three main risks.  
> For unsafe code, I have a closed sandbox.  
> For GitHub limits, I use the token of the user.  
> And for the deadline, I use MoSCoW, so Could stories go first.  
> Thank you, and I am ready for your questions.  

## Перевод

**Слайд 1: Real-Time Collaborative Code Editing Platform Based on CRDT.** Здравствуйте. Меня зовут Artsiom Harminovich. Сегодня я расскажу о платформе для совместного редактирования кода в реальном времени на основе CRDT. Мой руководитель — Maksym Svynarenko.

**Слайд 2: Hypothesis: a live session needs too many tools.** Начнём с проблемы. Моя идея в том, что для живой сессии нужно слишком много инструментов. 80% разработчиков работают не только в офисе. Но это не показывает мою проблему. Я думаю, что студенты и небольшие команды теряют время и работу, и это нужно проверить.

**Слайд 3: Goal: first shared edit in one minute or less, no lost edits.** Что я хочу изменить? Первая совместная правка должна занимать минуту или меньше. И правки не должны теряться. Это для живых сессий студентов и наставников. Пять задач, объект и предмет — на слайде.

**Слайд 4: Today: the team loses time and edits.** Теперь представьте студента с ошибкой в коде, который звонит другу. Студент показывает экран, и печатать может только он. Если друг хочет что-то изменить, студент отправляет ему код. Друг скачивает и запускает его, и на это уходит время. Потом кто-то вручную объединяет изменения, и правки могут потеряться. А если обрывается связь, останавливается и сессия. По моей модели другу без аккаунта нужно минимум 105 секунд на первую правку.

**Слайд 5: Analogs: nobody combines all three.** Такие продукты есть, и вот три из пяти, которые я сравнил. В Live Share и Replit гость без аккаунта не может править. В CodeShare аккаунты не нужны, но это один файл на один день. И ни один из них не объединяет сам работу без сети. Так что ни у кого нет всех трёх вещей: лёгкого входа, настоящего проекта и работы без сети.

**Слайд 6: Vision: one browser workspace, no lost edits.** Вот мой план: одно рабочее пространство в браузере для кода, документов, доски и чата. У меня четыре KPI. Первый — время: со 105 секунд до 60 или меньше. Второй — инструменты: с пяти до трёх, а позже до одного. Третий — потеря работы: ноль. И четвёртый — ввод: с половины людей до 90%. Проверка с пользователями даст настоящие числа. Голоса, видео и отладчика в проекте нет.

**Слайд 7: Seven epics, 27 stories, nine of them Must.** В проекте семь эпиков и 27 пользовательских историй, девять из них — Must. Вот одна цепочка. Проблема — медленный старт, поэтому цель — быстрый старт. KPI — одна минута, эпик — доступ, история — вход по ссылке. Для гостя это просто: открыть ссылку, ввести имя и править вместе со всеми.

**Слайд 8: Every quality requirement has a number.** У каждого правила качества есть число. Например, правка доходит до других за 100 мс или быстрее. Сервис работает 99% времени в месяц. По GDPR гость указывает только имя, и любой пользователь может удалить данные.

**Слайд 9: Concept: one workspace, chosen from three options.** И последнее — концепция. На этой схеме все пользователи работают в одном месте. Я выбрал её из трёх вариантов. Только своё рабочее пространство даёт лёгкий вход, настоящий проект и работу без сети. Есть три главных риска. Для небезопасного кода у меня закрытая песочница. Для лимитов GitHub я использую токен пользователя. А для срока сдачи — MoSCoW, поэтому первыми убираются истории Could. Спасибо, готов ответить на вопросы.

## Произношение: слова, которые нельзя заменить

| Слово | Как сказать |
|---|---|
| CRDT | си-ар-ди-ти (по буквам) |
| OT | оу-ти |
| KPI, KPIs | кей-пи-ай, кей-пи-айз |
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
| Replit | РЕП-лит |
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
| estimate | оценка | from a model |
| baseline | исходное значение | today's number |
| vision | видение | my plan |
| analogs | аналоги | other products |
| survey, questionnaire | опрос, анкета | a poll |
| legitimate interest | законный интерес | our interest in security |

## Ответы на вопросы комиссии

На вопросы остаётся около 5 минут из 10. Отвечайте этими короткими фразами и останавливайтесь. Если вопрос про таблицу,
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

> I am not sure yet, so for now it is only my idea.  
> Three sources support it, but none of them looks at live sessions.  
> That is why a poll and a test with users come first.  

**How is your solution better than the analogs?**
(Чем ваше решение лучше аналогов?)

> No other product gives all three: entry by link, a real project and offline work.  
> You can see it in this table.  

**Why these KPIs, and how will you measure them?**
(Почему такие KPI и как вы их измерите?)

> Each KPI comes from one problem, so it shows if this problem gets smaller.  
> Five pairs of new users do the same task with today's tools and with my platform.  
> So I test both in the same way.  

**Why three tools and not one in the first release?**
(Почему в первом выпуске три инструмента, а не один?)

> Because chat, documents and the whiteboard are Should stories.  
> So at first, people still need a chat tool and a whiteboard.  
> In the full release, one tool is enough.  

**Why is offline editing a Must story?**
(Почему работа без сети — это Must?)

> Because if the connection stops, people can lose work.  
> In a poll of students in England, 52 percent said that a bad connection was a problem for their learning.  
> But this poll is not about live sessions, so I made a rule.  
> If less than one in three people have breaks, this story moves to Should.  

**What stays outside the project, and why?**
(Что осталось вне проекта и почему?)

> Voice and video calls, a debugger, private GitHub projects and a full Git tool.  
> I left out voice and video because teams already have a call tool.  

**Which stories are Must? What will you drop if time is short?**
(Какие истории Must? Что уберёте, если не хватит времени?)

> Nine stories, and they cover access, editing together, offline work and the file tree.  
> If time is short, I drop Could stories first, and then Should stories.  

**What personal data do you process, and on what legal basis?**
(Какие персональные данные вы обрабатываете и на каком основании?)

> I keep e-mail, name, password hash and the IP address in logs, and also the text in files and chat.  
> Guests give only a name.  
> The basis is the contract, and for security logs, it is our interest in security.  

**What is the riskiest part, and what do you do about it?**
(Что самое рискованное и что вы с этим делаете?)

> First, my idea can be wrong, so the test with users comes first.  
> Second, the deadline is fixed, so I use MoSCoW.  
> And user code runs in a closed sandbox with no network, to keep other people safe.  

**Why CRDT? Your requirements do not name it.**
(Почему CRDT? В требованиях его нет.)

> My stories say what is needed, and the design part says how.  
> In my test, OT and CRDT had the same speed on one computer.  
> But with CRDT, offline work is easier to join, so I chose it.  

**You already have a prototype. Are these real requirements?**
(У вас уже есть прототип. Это настоящие требования?)

> Yes, this is a real risk, so it is in my risk table.  
> That is why each story links to a goal.  
> And the test with users can still change my list of stories.  

**Did you use AI in this work?**
(Вы использовали ИИ в этой работе?)

> Yes, I used Claude, an AI assistant.  
> It helped me to write the English text, to check sources and to write code.  
> You can read about it in the Statements part.  
> But I checked the work, and I can explain every choice.  

**Чтобы выиграть пару секунд:**

> Good question.  
> One moment, please. Let me open the slide.  

**Если не поняли вопрос:**

> Sorry, could you repeat the question, please?  
> Do you mean …? (и повторите вопрос своими словами)  
