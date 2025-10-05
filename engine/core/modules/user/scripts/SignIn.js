class SignIn {
  constructor(element, options = {}) {
    // element может быть селектором или DOM-узлом
    this.componentElement =
      typeof element === 'string' ? document.querySelector(element) : element;
    this.options = options;

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

      this._clearValidation(form);

      try {
        const url = urlBuilder(form);
        const result = await this._postForm(form, url);
        this._handleResult(result, /*isLogout*/ false, form);
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

  _handleResult(result, isLogout = false, form = null) {
    if (result?.result) {
      if (form) this._clearValidation(form);
      Energine.noticeBox(result.message, 'success', () => {
        const redirect = isLogout
          ? `/${Energine.lang}/`
          : `/${Energine.lang}/${result.redirect}`;
        document.location.href = redirect;
      });
    } else {
      const fieldName = result?.field ?? '';
      const message = result?.message ?? 'Сталася помилка';

      const fieldHandled = this._showFieldError(form, fieldName, message);
      if (!fieldHandled) {
        this._showFormError(form, message);
      }
      Energine.alertBox(result?.message ?? 'Сталася помилка', 'error');
    }
  }

  _handleError(err) {
    // Единый обработчик сетевых/HTTP ошибок
    console.error(err);
    Energine.alertBox('Помилка з’єднання. Спробуйте ще раз.', 'error');
  }

  _clearValidation(form) {
    if (!form) return;

    form.querySelectorAll('.is-invalid').forEach((input) => {
      input.classList.remove('is-invalid');
    });

    form.querySelectorAll('.invalid-feedback').forEach((feedback) => {
      feedback.textContent = '';
      feedback.classList.remove('d-block');
      feedback.classList.add('d-none');
    });

    const alert = form.querySelector('[data-role="form-error"]');
    if (alert) {
      alert.textContent = '';
      alert.classList.add('d-none');
    }
  }

  _showFieldError(form, fieldName, message) {
    if (!form || !fieldName) return false;

    const selector = `[name$="[${fieldName}]"]`;
    let input = form.querySelector(selector);
    if (!input) {
      input = form.querySelector(`[name="${fieldName}"]`);
    }
    if (!input) return false;

    input.classList.add('is-invalid');

    const container =
      input.closest('.mb-3, .mb-4, .form-group, .form-floating') || form;
    let feedback = container.querySelector(
      `.invalid-feedback[data-field="${fieldName}"]`
    );
    if (!feedback) {
      feedback = container.querySelector('.invalid-feedback');
    }

    if (feedback) {
      feedback.textContent = message ?? '';
      feedback.classList.remove('d-none');
      feedback.classList.add('d-block');
    }

    return true;
  }

  _showFormError(form, message) {
    if (!form) return;
    const alert = form.querySelector('[data-role="form-error"]');
    if (!alert) return;

    alert.textContent = message ?? '';
    alert.classList.remove('d-none');
  }
}

if (typeof window !== 'undefined') {
    window.SignIn = SignIn;
}

// Пример использования:
// new SignIn('#sign-in-component');

export default SignIn;
