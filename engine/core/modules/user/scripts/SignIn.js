class SignIn {
  constructor(element) {
    // element может быть селектором или DOM-узлом
    this.componentElement =
      typeof element === 'string' ? document.querySelector(element) : element;

    // Берём template из атрибута компонента (если есть)
    this.singlePath = this.componentElement?.getAttribute('template') || '';

    // Навешиваем обработчики
    this._bind();
  }

  _bind() {
    // Быстрая регистрация
    this._bindForm('#sign_up_fast', () => `${Energine.lang}${this.singlePath}sign-up-fast/`);

    // Обычная регистрация
    this._bindForm('#sign_up', () => `${this.singlePath}sign-up/`);

    // Вход
    this._bindForm('#sign_in', () => `${this.singlePath}sign-in/`);

    // Логаут
    this._bindLogout('.btn-logout');
  }

  _bindForm(selector, urlBuilder) {
    const form = document.querySelector(selector);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Простая защита от повторной отправки
      if (form.dataset.submitting === '1') return;
      form.dataset.submitting = '1';

      try {
        const url = urlBuilder(form);
        const result = await this._postForm(form, url);
        this._handleResult(result, /*isLogout*/ false);
      } catch (err) {
        this._handleError(err);
      } finally {
        form.dataset.submitting = '0';
      }
    });
  }

  _bindLogout(selector) {
    document.querySelectorAll(selector).forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          const url = `${Energine.lang}/login/logout/`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const result = await response.json();
          this._handleResult(result, /*isLogout*/ true);
        } catch (err) {
          this._handleError(err);
        }
      });
    });
  }

  async _postForm(form, url) {
    const formData = new FormData(form);
    // Сервер ожидает urlencoded как у jQuery.serialize()
    const body = new URLSearchParams();
    for (const [k, v] of formData.entries()) body.append(k, v);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: body.toString(),
      credentials: 'same-origin',
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  _handleResult(result, isLogout = false) {
    if (result?.result) {
      Energine.noticeBox(result.message, 'success', () => {
        const redirect = isLogout
          ? `/${Energine.lang}/`
          : `/${Energine.lang}/${result.redirect}`;
        document.location.href = redirect;
      });
    } else {
      Energine.alertBox(result?.message ?? 'Сталася помилка', 'error');
    }
  }

  _handleError(err) {
    // Единый обработчик сетевых/HTTP ошибок
    console.error(err);
    Energine.alertBox('Помилка з’єднання. Спробуйте ще раз.', 'error');
  }
}

// Пример использования:
// new SignIn('#sign-in-component');
