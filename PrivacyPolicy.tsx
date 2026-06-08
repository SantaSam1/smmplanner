// src/pages/PrivacyPolicy.tsx
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">SMMPlanner</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Политика конфиденциальности</h1>
          <p className="text-gray-500 text-sm">Последнее обновление: 1 июня 2026 г.</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Общие положения</h2>
            <p>Настоящая Политика конфиденциальности описывает, как SMMPlanner («мы», «нас» или «наш») собирает, использует и защищает информацию, которую вы предоставляете при использовании нашего сервиса по адресу smmplanner-git-main-forge3d.vercel.app.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Сбор информации</h2>
            <p>Мы собираем следующие виды информации:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Регистрационные данные:</strong> адрес электронной почты и пароль при создании аккаунта.</li>
              <li><strong>Данные социальных сетей:</strong> токены доступа к подключённым аккаунтам (ВКонтакте, Telegram, Одноклассники, YouTube, Instagram и др.).</li>
              <li><strong>Контент постов:</strong> тексты, изображения и видеофайлы, которые вы загружаете для публикации.</li>
              <li><strong>Технические данные:</strong> IP-адрес, тип браузера, данные об использовании сервиса.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Использование информации</h2>
            <p>Собранная информация используется для:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Предоставления и улучшения функций сервиса.</li>
              <li>Аутентификации и защиты вашего аккаунта.</li>
              <li>Публикации контента в социальных сетях от вашего имени.</li>
              <li>Отправки технических уведомлений и обновлений сервиса.</li>
              <li>Анализа использования для улучшения продукта.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Хранение и защита данных</h2>
            <p>Ваши данные хранятся в защищённой базе данных Supabase с шифрованием в состоянии покоя и при передаче. Токены доступа к социальным сетям хранятся в зашифрованном виде и используются исключительно для публикации контента по вашим инструкциям.</p>
            <p className="mt-2">Мы применяем технические и организационные меры безопасности, соответствующие отраслевым стандартам, для защиты ваших персональных данных от несанкционированного доступа, изменения или уничтожения.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Передача данных третьим лицам</h2>
            <p>Мы не продаём, не обмениваем и не передаём ваши персональные данные третьим лицам, за исключением:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Платформы социальных сетей:</strong> при публикации контента данные передаются соответствующим API (VK API, Telegram Bot API, OK API и др.).</li>
              <li><strong>Облачные провайдеры:</strong> Supabase (база данных), Vercel (хостинг) — для обеспечения работы сервиса.</li>
              <li><strong>Требования закона:</strong> при наличии законного требования компетентных органов.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Ваши права</h2>
            <p>Вы вправе:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Запросить доступ к своим персональным данным.</li>
              <li>Исправить неточные данные.</li>
              <li>Удалить свой аккаунт и все связанные данные.</li>
              <li>Отозвать доступ к подключённым социальным сетям в любое время.</li>
              <li>Получить копию своих данных в машиночитаемом формате.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Файлы cookie</h2>
            <p>Сервис использует файлы cookie для поддержания сессии авторизации и улучшения работы интерфейса. Вы можете отключить cookie в настройках браузера, однако это может повлиять на функциональность сервиса.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Изменения политики</h2>
            <p>Мы оставляем за собой право обновлять данную Политику конфиденциальности. О существенных изменениях мы уведомим вас по электронной почте или через интерфейс сервиса. Продолжение использования сервиса после уведомления означает ваше согласие с обновлённой политикой.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Контакты</h2>
            <p>По вопросам, связанным с обработкой персональных данных, обращайтесь по адресу: <a href="mailto:privacy@smmplanner.app" className="text-blue-600 hover:underline">privacy@smmplanner.app</a></p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <a href="/" className="text-blue-600 hover:underline text-sm font-medium">← Вернуться на главную</a>
        </div>
      </div>
    </div>
  );
}
