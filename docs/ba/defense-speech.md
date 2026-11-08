# Речь на защите BA: простой вариант

Презентация: https://claude.ai/artifact/TtYdwN51ke3VLoZECGBt54 (этот же текст лежит в заметках к слайдам).

**Слот 10 минут:** доклад и вопросы комиссии вместе. Доклад около 5 минут, на вопросы остаётся около 5.

**Длина речи:** 542 слов. По расчёту это около 5 минут, точное время покажет репетиция с таймером.

**Как читать:** одна строка — одно предложение. После каждой строки короткая пауза.

**Слайды:** каждая часть речи относится к одному слайду и идёт в том же порядке, что и на нём. Заголовок части — это заголовок слайда. Номер слайда указан как в PowerPoint.

**Тезисы:** у каждого слайда один тезис, он звучит в речи слово в слово. Если забудете текст, скажите тезис и переходите к следующему слайду.

**Слова:** сложные слова в речи заменены простыми. На слайдах термины из BA остались, их читать вслух не нужно.

**Как репетировать:** прочитайте вслух с таймером 3–4 раза. Потом говорите, глядя только на слайды. Если выходит больше 5 минут, пропустите строку «Easy means» на слайде 8 и строку «None of these» на слайде 5.

В презентации 9 слайдов: титульный и 8 основных.

## Речь

### Слайд 1: Real-Time Collaborative Code Editing Platform Based on CRDT [15 с]

**Тезис:** Today I will show my plan for a real-time platform for editing code together, based on CRDT.

> Hello, everyone.  
> My name is Artsiom Harminovich.  
> Today I will show my plan for a real-time platform for editing code together, based on CRDT.  
> My supervisor is Maksym Svynarenko.  

### Слайд 2: Hypothesis: a live session needs too many tools [35 с]

**Тезис:** My idea is that a live session needs too many tools.

> So what is the problem?  
> My idea is that a live session needs too many tools.  
> Tools matter when people are apart.  
> In a Stack Overflow poll from 2024, 80 percent of developers do not work only in an office.  
> But this number does not show the problem.  
> Students and small teams may lose time and work.  
> A test with users must check this.  

### Слайд 3: Goal: first shared edit in one minute or less, no lost edits [20 с]

**Тезис:** The first shared edit in one minute or less, and no lost edits.

> And what is my goal?  
> The first shared edit in one minute or less, and no lost edits.  
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
> My model says that a partner with no account needs at least 105 seconds for the first edit.  

### Слайд 5: Analogs: nobody combines all three [30 с]

**Тезис:** Of the five I compared, none has easy entry, a real project and offline work together.

> Can other products solve this?  
> Of the five I compared, none has easy entry, a real project and offline work together.  
> Live Share and Replit have real projects, but a guest with no account cannot edit.  
> CodeShare has easy entry, but it is one file for one day.  
> None of these joins offline work by itself.  

### Слайд 6: Vision: one browser workspace, no lost edits [35 с]

**Тезис:** So my plan is one browser workspace.

> So my plan is one browser workspace.  
> Four KPIs will show if it works.  
> First, time: 105 seconds from a model, down to 60 or less.  
> Second, tools: from five to three, and later to one.  
> Third, lost work: zero percent, and the test will give today's number.  
> Fourth, shared typing: 50 percent from a model, up to at least 90.  
> Voice, video and a debugger stay out.  

### Слайд 7: Seven epics, 27 stories, nine of them Must [40 с]

**Тезис:** To get there, I have seven epics and 27 user stories, each with a reason.

> To get there, I have seven epics and 27 user stories, each with a reason.  
> Nine are Must.  
> Here is one chain.  
> The problem is a slow start, so the goal is a fast start.  
> The KPI is one minute, the epic is access, and the story is join by link.  
> Remember the friend?  
> The friend will open the link, enter a name, edit together and see the cursors.  

### Слайд 8: Every quality requirement has a number [35 с]

**Тезис:** Each quality rule also has a number, so I can check it.

> Each quality rule also has a number, so I can check it.  
> Fast means an edit gets to others in 100 milliseconds or less.  
> Stable means the service works at least 99 percent of the month.  
> Easy means the first guest edit in 60 seconds, with no help.  
> For GDPR, guests give no e-mail, and users can delete their data.  

### Слайд 9: Concept: one workspace, chosen from three options [40 с]

**Тезис:** Last, the picture shows my choice from three options: my own workspace.

> Last, the picture shows my choice from three options: my own workspace.  
> It costs the most to build.  
> But only this option gives easy entry, a real project and offline work.  
> There are three main risks.  
> Unsafe user code?  
> It will run in a closed sandbox.  
> GitHub limits?  
> I will use the user's token.  
> Too much work for the deadline?  
> With MoSCoW, I will drop Could stories first.  
> Thank you.  
> I am ready for your questions.  

## Перевод

**Слайд 1: Real-Time Collaborative Code Editing Platform Based on CRDT.** Здравствуйте. Меня зовут Artsiom Harminovich. Сегодня я покажу свой план платформы для совместного редактирования кода в реальном времени на основе CRDT. Мой руководитель — Maksym Svynarenko.

**Слайд 2: Hypothesis: a live session needs too many tools.** Так в чём проблема? Моя идея в том, что для живой сессии нужно слишком много инструментов. Инструменты важны, когда люди работают порознь. В опросе Stack Overflow за 2024 год 80 процентов разработчиков работают не только в офисе. Но это число не показывает саму проблему. Студенты и небольшие команды могут терять время и работу. Проверка с пользователями должна это подтвердить или опровергнуть.

**Слайд 3: Goal: first shared edit in one minute or less, no lost edits.** А какая у меня цель? Первая совместная правка за минуту или меньше, и никаких потерянных правок. Это для живых сессий студентов и наставников. Пять задач, объект и предмет — на слайде.

**Слайд 4: Today: the team loses time and edits.** Но сегодня команда может терять время и правки. Представьте студента с ошибкой в коде, который звонит другу и показывает экран. Друг не может печатать, поэтому студент отправляет код. Друг скачивает его, устанавливает и запускает, и на это уходит время. Потом кто-то вручную объединяет изменения, и правки могут потеряться. Если обрывается связь, останавливается и сессия. По моей модели партнёру без аккаунта нужно минимум 105 секунд на первую правку.

**Слайд 5: Analogs: nobody combines all three.** Могут ли это решить другие продукты? Из пяти, которые я сравнил, ни у одного нет вместе лёгкого входа, настоящего проекта и работы без сети. В Live Share и Replit есть настоящие проекты, но гость без аккаунта не может править. В CodeShare вход лёгкий, но это один файл на один день. Ни один из этих продуктов не объединяет сам работу без сети.

**Слайд 6: Vision: one browser workspace, no lost edits.** Итак, мой план — одно рабочее пространство в браузере. Четыре KPI покажут, работает ли это. Первый — время: 105 секунд по модели, снижаем до 60 или меньше. Второй — инструменты: с пяти до трёх, а позже до одного. Третий — потерянная работа: ноль процентов, а сегодняшнее число даст проверка. Четвёртый — совместный ввод: 50 процентов по модели, поднимаем минимум до 90. Голос, видео и отладчик остаются вне проекта.

**Слайд 7: Seven epics, 27 stories, nine of them Must.** Чтобы прийти к этому, у меня есть семь эпиков и 27 пользовательских историй, и у каждой есть причина. Девять из них — Must. Вот одна цепочка. Проблема — медленный старт, поэтому цель — быстрый старт. KPI — одна минута, эпик — доступ, история — вход по ссылке. Помните друга? Друг откроет ссылку, введёт имя, будет править вместе со студентом и увидит курсоры.

**Слайд 8: Every quality requirement has a number.** У каждого правила качества тоже есть число, поэтому я могу его проверить. Быстро — значит, правка доходит до других за 100 миллисекунд или меньше. Стабильно — значит, сервис работает минимум 99 процентов месяца. Просто — значит, первая правка гостя за 60 секунд, без помощи. По GDPR гости не указывают e-mail, а пользователи могут удалить свои данные.

**Слайд 9: Concept: one workspace, chosen from three options.** И последнее: на схеме мой выбор из трёх вариантов — своё рабочее пространство. Его дороже всего создать. Но только этот вариант даёт лёгкий вход, настоящий проект и работу без сети. Есть три главных риска. Небезопасный код пользователей? Он будет работать в закрытой песочнице. Лимиты GitHub? Я буду использовать токен пользователя. Слишком много работы для срока сдачи? С MoSCoW я первыми уберу истории Could. Спасибо. Я готов ответить на ваши вопросы.

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
| cursors | КЁР-серз |
| Stack Overflow | стэк оу-вер-ФЛОУ |
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
| estimate | оценка | from a model |
| baseline | исходное значение | today's number |
| vision | видение | my plan |
| analogs | аналоги | other products |
| survey, questionnaire | опрос, анкета | a poll |
| legitimate interest | законный интерес | our interest in security |

## Ответы на вопросы комиссии

На вопросы остаётся около 5 минут из 10. Отвечайте этими короткими фразами и останавливайтесь. Если вопрос про таблицу,
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

**Where does the 80 percent come from?**
(Откуда взялись 80 процентов?)

> From the Stack Overflow poll of 2024.  
> About 55 thousand developers answered this question.  

**How did you make sure the problem is real?**
(Как вы убедились, что проблема реальна?)

> I am not sure yet, so for now it is only my idea.  
> Three sources support it, but none of them looks at live sessions.  
> That is why a poll and a test with users come first.  

**How is your solution better than the analogs?**
(Чем ваше решение лучше аналогов?)

> No other product gives all three: entry by link, a real project and offline work.  
> You can see it in the table on slide five.  

**Which five products did you compare?**
(Какие пять продуктов вы сравнили?)

> Live Share, Replit, CodeShare, a Yjs demo and Excalidraw.  
> The full table is in chapter one of my document.  

**What are the three options?**
(Какие три варианта вы сравнили?)

> Today's tools, open-source demos and my own workspace.  
> Today's tools cost almost nothing, but a guest with no account cannot write.  
> Demos cost more, and the parts do not fit together.  
> My own workspace costs the most, but only it gives all three.  

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
