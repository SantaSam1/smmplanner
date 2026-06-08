// src/pages/TermsOfService.tsx
export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">SMMPlanner</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Пользовательское соглашение</h1>
          <p className="text-gray-500 text-sm">Последнее обновление: 1 июня 2026 г.</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Принятие условий</h2>
            <p>Используя сервис SMMPlanner («Сервис»), вы соглашаетесь с настоящим Пользовательским соглашением («Соглашение»). Если вы не согласны с условиями, пожалуйста, прекратите использование Сервиса.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Описание сервиса</h2>
            <p>SMMPlanner — инструмент для управления публикациями в социальных сетях, позволяющий:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Создавать и планировать публикации в нескольких социальных сетях одновременно.</li>
              <li>Автоматически публиковать контент по расписанию.</li>
              <li>Настраивать автоматическую публикацию из RSS-лент.</li>
              <li>Управлять медиафайлами и отслеживать статус публикаций.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Регистрация и аккаунт</h2>
            <p>Для использования Сервиса необходимо создать аккаунт. Вы обязуетесь:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Предоставить достоверную информацию при регистрации.</li>
              <li>Обеспечить конфиденциальность своих учётных данных.</li>
              <li>Незамедлительно уведомить нас о несанкционированном доступе к вашему аккаунту.</li>
              <li>Нести ответственность за все действия, совершённые через ваш аккаунт.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Допустимое использование</h2>
            <p>Вы вправе использовать Сервис исключительно в законных целях. Запрещается:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Публиковать незаконный, оскорбительный или нарушающий права третьих лиц контент.</li>
              <li>Использовать Сервис для рассылки спама или нежелательных сообщений.</li>
              <li>Нарушать правила использования подключённых социальных платформ.</li>
              <li>Предпринимать попытки несанкционированного доступа к Сервису или его инфраструктуре.</li>
              <li>Воспроизводить, копировать или перепродавать Сервис без письменного разрешения.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Подключение социальных сетей</h2>
            <p>При подключении аккаунтов социальных сетей вы предоставляете Сервису право публиковать контент от вашего имени. Вы несёте полную ответственность за:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Соответствие публикуемого контента правилам соответствующих платформ.</li>
              <li>Наличие необходимых прав на публикуемые материалы.</li>
              <li>Последствия публикации контента в ваших аккаунтах.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Интеллектуальная собственность</h2>
            <p>Все права на Сервис, включая программное обеспечение, дизайн и торговые марки, принадлежат SMMPlanner. Вы сохраняете все права на контент, который публикуете через Сервис.</p>
            <p className="mt-2">Используя Сервис, вы предоставляете нам ограниченную лицензию на обработку вашего контента исключительно в целях оказания услуг.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Ограничение ответственности</h2>
            <p>Сервис предоставляется «как есть». Мы не несём ответственности за:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Временную недоступность Сервиса или отдельных его функций.</li>
              <li>Сбои в работе API социальных сетей и изменения их политик.</li>
              <li>Потерю данных вследствие технических неполадок.</li>
              <li>Косвенные, случайные или последующие убытки.</li>
            </ul>
            <p className="mt-2">Максимальная ответственность ограничена суммой, уплаченной вами за Сервис в течение предыдущих 12 месяцев.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Приостановление и удаление аккаунта</h2>
            <p>Мы вправе приостановить или удалить ваш аккаунт при нарушении настоящего Соглашения. Вы можете удалить свой аккаунт в любое время, обратившись в поддержку. При удалении аккаунта все ваши данные будут удалены в течение 30 дней.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Изменения соглашения</h2>
            <p>Мы оставляем за собой право изменять данное Соглашение. Существенные изменения вступают в силу через 30 дней после уведомления. Продолжение использования Сервиса означает согласие с новыми условиями.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Применимое право</h2>
            <p>Настоящее Соглашение регулируется законодательством Российской Федерации. Споры разрешаются в судебном порядке по месту нахождения Сервиса.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Контакты</h2>
            <p>По вопросам, связанным с настоящим Соглашением: <a href="mailto:legal@smmplanner.app" className="text-blue-600 hover:underline">legal@smmplanner.app</a></p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <a href="/" className="text-blue-600 hover:underline text-sm font-medium">← Вернуться на главную</a>
        </div>
      </div>
    </div>
  );
}
