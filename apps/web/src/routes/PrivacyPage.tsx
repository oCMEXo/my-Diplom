import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/layout/ThemeToggle";
import { Wordmark } from "../components/ui/Logo";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <div className="relative min-h-screen px-5 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <main className="mx-auto w-full max-w-2xl space-y-8">
        <Link to="/" aria-label="На главную" className="inline-block">
          <Wordmark />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Данные и приватность</h1>
          <p className="mt-2 text-sm text-muted">
            Collab — учебный проект, дипломная работа. Здесь коротко сказано, какие данные хранит сервис, зачем и как
            их удалить.
          </p>
        </div>

        <Section title="Что мы храним">
          <ul className="list-disc space-y-1 pl-5">
            <li>Для аккаунта: имя, почта и хеш пароля (сам пароль не хранится).</li>
            <li>Для гостя: только введённое имя. Почта не нужна.</li>
            <li>То, что вы создаёте: проекты, файлы, их версии, сообщения в чате.</li>
            <li>Токен GitHub, если вы его вводите, используется только для одного запроса и не сохраняется.</li>
          </ul>
        </Section>

        <Section title="Зачем и на каком основании">
          <p>
            Данные нужны, чтобы сервис работал: входить в аккаунт, показывать участникам имена и курсоры, хранить
            проекты. Это исполнение договора с пользователем (GDPR, ст. 6(1)(b)). Защита от злоупотреблений, например
            ограничение числа попыток входа по IP-адресу, — законный интерес (ст. 6(1)(f)).
          </p>
          <p>Аналитики, рекламы и передачи данных третьим лицам нет.</p>
        </Section>

        <Section title="Кто видит ваши данные">
          <p>
            Участники проекта видят ваше имя, правки и сообщения в этом проекте. Почту других участников сервис не
            показывает.
          </p>
        </Section>

        <Section title="Сколько хранится">
          <ul className="list-disc space-y-1 pl-5">
            <li>Аккаунт и проекты — пока вы их не удалите.</li>
            <li>Удалённые файлы — 30 дней в корзине, затем навсегда.</li>
            <li>Сессия входа — до 30 дней, если вы ею не пользуетесь.</li>
          </ul>
        </Section>

        <Section title="Что хранится в вашем браузере">
          <p>
            Сессия входа, настройки, отметка о прочитанном чате и копии открытых файлов, чтобы работать без сети. Cookie
            для слежки не используются.
          </p>
        </Section>

        <Section title="Ваши права">
          <p>
            Вы можете исправить имя и скачать файлы проекта архивом. Удалить аккаунт можно в меню профиля: вместе с ним
            удаляются ваши сообщения и проекты, которыми вы владеете. Копии файлов в этом браузере тоже стираются.
          </p>
          <p>С вопросами обращайтесь к владельцу этого сайта: обычно это тот, кто дал вам ссылку.</p>
        </Section>
      </main>
    </div>
  );
}
