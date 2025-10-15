<?php
declare(strict_types=1);

use Symfony\Component\HttpFoundation\Response as SResponse;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

/**
 * HTTP-response (legacy API + Symfony HttpFoundation under the hood), PHP 8.3.
 *
 * Сохранены: prepareRedirectURL(), setStatus(), setHeader(), addCookie(),
 * sendCookies(), sendHeaders(), deleteCookie(), setRedirect(),
 * redirectToCurrentSection(), write(), goBack(), disableCache(), commit().
 *
 * Добавлены: text(), html(), json(), noContent(), file(), download(),
 * cacheFor(), setETag(), setLastModified(), vary(), cors(),
 * setHeaderIfNotSet(), clearHeader(), clearHeaders(), error().
 */
final class Response extends BaseObject
{
    private SResponse $resp;
    private string    $body    = '';
    private array     $cookies = [];

    public function __construct()
    {
        $this->resp = new SResponse('', 200);
    }

    /** Поддержка %lang% и %site% в ссылках для редиректа */
    public static function prepareRedirectURL($redirectURL)
    {
        if (empty($redirectURL)) return $redirectURL;
        $lang = E()->getLanguage();

        return str_replace(
            ['%lang%', '%site%'],
            [
                $lang->getAbbrByID($lang->getCurrent()),
                E()->getSiteManager()->getCurrentSite()->base
            ],
            $redirectURL
        );
    }

    /** Статус (reason-phrase в HTTP/2+ не используется, игнорируем) */
    public function setStatus($statusCode, $reasonPhrase = null)
    {
        $this->resp->setStatusCode((int)$statusCode);
        // при желании можно сохранить reasonPhrase в пользовательский заголовок
    }

    /** Заголовок */
    public function setHeader($name, $value, $replace = true)
    {
        $this->resp->headers->set((string)$name, (string)$value, (bool)$replace);
    }

    /** Cookie как и раньше (domain/path по старым правилам) */
    public function addCookie($name = UserSession::DEFAULT_SESSION_NAME, $value = '', $expire = 0, $domain = false, $path = '/')
    {
        if (!$domain) {
            if ($confDomain = $this->getConfigValue('site.domain')) {
                $domain = '.' . $confDomain;
                $path   = '/';
            } else {
                $path   = E()->getSiteManager()->getCurrentSite()->root;
                $domain = E()->getSiteManager()->getCurrentSite()->domain;
            }
        }

        $secure   = false;
        $httpOnly = false;

        $_COOKIE[$name] = $value; // мгновенная видимость в текущем запросе
        $this->cookies[$name] = compact('value', 'expire', 'path', 'domain', 'secure');

        $cookie = new Cookie(
            (string)$name,
            (string)$value,
            $expire > 0 ? (int)$expire : 0,
            (string)$path,
            (string)$domain,
            (bool)$secure,
            (bool)$httpOnly,
            false, // raw
            Cookie::SAMESITE_LAX
        );
        $this->resp->headers->setCookie($cookie);
    }

    /** В HttpFoundation куки уезжают с заголовками; оставляем для совместимости */
    public function sendCookies() { /* no-op */ }

    /** Только заголовки (без тела) */
    public function sendHeaders() { $this->resp->sendHeaders(); }

    /** Удалить cookie (ставим истёкшую дату) */
    public function deleteCookie($name)
    {
        $path   = E()->getSiteManager()->getCurrentSite()->root;
        $domain = E()->getSiteManager()->getCurrentSite()->domain;
        $this->addCookie($name, '', time() - 3600, $domain, $path);
    }

    /** Редирект и немедленный commit() */
    public function setRedirect($location, $status = 302)
    {
        if (!in_array((int)$status, [301, 302], true)) {
            throw new InvalidArgumentException('Invalid redirect status');
        }

        $this->setStatus((int)$status);
        $this->setHeader('Location', (string)$location);
        $this->setHeader('Content-Length', '0');
        $this->body = '';
        $this->resp->setContent('');
        $this->commit();
    }

    /** Редирект на текущий раздел с опциональным action */
    public function redirectToCurrentSection($action = '')
    {
        if ($action && substr($action, -1) !== '/') { $action .= '/'; }
        $request = E()->getRequest();

        $this->setRedirect(
            E()->getSiteManager()->getCurrentSite()->base
            . $request->getLangSegment()
            . $request->getPath(Request::PATH_TEMPLATE, true)
            . $action
        );
    }

    /** Пишем в тело ответа */
    public function write($data)
    {
        $this->body .= (string)$data;
        $this->resp->setContent($this->body);
    }

    /** Назад (по return/referrer) */
    public function goBack()
    {
        if (isset($_GET['return']))          { $url = (string)$_GET['return']; }
        elseif (isset($_SERVER['HTTP_REFERER'])) { $url = (string)$_SERVER['HTTP_REFERER']; }
        else                                   { $url = (string)E()->getSiteManager()->getCurrentSite()->root; }

        $this->setHeader('Location', $url);
        $this->setStatus(302);
        $this->resp->setContent('');
        $this->commit();
    }

    /** Запретить кеширование */
    public function disableCache()
    {
        $this->setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        $this->setHeader('Pragma', 'no-cache');
        $this->setHeader('X-Accel-Expires', '0');
    }

    /**
     * Подготовить HttpFoundation-ответ (с учётом gzip-настроек Energine).
     */
    public function toHttpFoundationResponse(): SResponse
    {
        $response = clone $this->resp;

        $body = $this->body;
        if ($response->getContent() !== $body) {
            $response->setContent($body);
        }

        $shouldCompress =
            (bool)BaseObject::_getConfigValue('site.compress')
            && isset($_SERVER['HTTP_ACCEPT_ENCODING'])
            && str_contains($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip')
            && !(bool)BaseObject::_getConfigValue('site.debug');

        if ($shouldCompress) {
            $response->headers->set('Vary', 'Accept-Encoding');
            $response->headers->set('Content-Encoding', 'gzip');
            $body = gzencode((string)$response->getContent(), 6);
            $response->setContent($body);
            // при желании можно выставить Content-Length
            // $response->headers->set('Content-Length', (string)strlen($body));
        }

        return $response;
    }

    /** Финальная отправка (gzip — как в старом коде) */
    public function commit()
    {
        $response = $this->toHttpFoundationResponse();
        $response->send();
        session_write_close();
        exit;
    }

    /** Получить «сырой» Symfony Response. */
    public function raw(): SResponse
    {
        return $this->resp;
    }

    /* ===== Удобные хелперы ===== */

    public function text(string $content, int $status = 200): void {
        $this->setStatus($status);
        $this->setHeader('Content-Type', 'text/plain; charset=utf-8');
        $this->write($content);
    }

    public function html(string $content, int $status = 200): void {
        $this->setStatus($status);
        $this->setHeader('Content-Type', 'text/html; charset=utf-8');
        $this->write($content);
    }

    public function json(mixed $data, int $status = 200): void {
        $this->setStatus($status);
        $this->setHeader('Content-Type', 'application/json; charset=utf-8');
        $this->write(json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
    }

    public function noContent(int $status = 204): void {
        $this->setStatus($status);
        $this->write('');
    }

    /** Отдать файл inline */
    public function file(string $path): void {
        $r = new BinaryFileResponse($path);
        foreach ($this->resp->headers->allPreserveCase() as $n => $vals) {
            foreach ($vals as $v) { $r->headers->set($n, $v, false); }
        }
        $r->setPrivate();
        $r->prepare(\Symfony\Component\HttpFoundation\Request::createFromGlobals());
        $r->send();
        session_write_close();
        exit;
    }

    /** Скачать файл как attachment */
    public function download(string $path, ?string $downloadAs = null): void {
        $r = new BinaryFileResponse($path);
        $r->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_ATTACHMENT,
            $downloadAs ?: basename($path),
        );
        foreach ($this->resp->headers->allPreserveCase() as $n => $vals) {
            foreach ($vals as $v) { $r->headers->set($n, $v, false); }
        }
        $r->prepare(\Symfony\Component\HttpFoundation\Request::createFromGlobals());
        $r->send();
        session_write_close();
        exit;
    }

    /** Кеш-хелперы */
    public function cacheFor(int $seconds): void { $this->setHeader('Cache-Control', "public, max-age={$seconds}"); }
    public function setETag(string $etag): void  { $this->setHeader('ETag', $etag); }
    public function setLastModified(\DateTimeInterface $dt): void {
        $this->setHeader('Last-Modified', gmdate('D, d M Y H:i:s', $dt->getTimestamp()).' GMT');
    }

    /** Vary и CORS */
    public function vary(string ...$headers): void {
        $cur  = $this->resp->headers->get('Vary');
        $list = array_filter(array_map('trim', explode(',', (string)$cur)));
        $list = array_unique(array_merge($list, $headers));
        $this->setHeader('Vary', implode(', ', $list));
    }

    public function cors(
        string $origin = '*',
        array $methods = ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
        array $headers = ['Content-Type','Authorization'],
        bool $credentials = false
    ): void {
        $this->setHeader('Access-Control-Allow-Origin', $origin);
        $this->setHeader('Access-Control-Allow-Methods', implode(',', $methods));
        $this->setHeader('Access-Control-Allow-Headers', implode(',', $headers));
        if ($credentials) $this->setHeader('Access-Control-Allow-Credentials', 'true');
    }

    /** Аккуратная работа с заголовками */
    public function setHeaderIfNotSet(string $name, string $value): void {
        if (!$this->resp->headers->has($name)) $this->setHeader($name, $value);
    }
    public function clearHeader(string $name): void { $this->resp->headers->remove($name); }
    public function clearHeaders(): void {
        foreach (array_keys($this->resp->headers->all()) as $h) $this->resp->headers->remove($h);
    }

    /** Быстрый текстовый ответ-ошибка */
    public function error(int $status, string $message = 'Error'): void {
        $this->text($message, $status);
    }

    /** Проксируем методы HttpFoundation Response. */
    public function __call(string $name, array $arguments): mixed
    {
        if (!method_exists($this->resp, $name)) {
            throw new \BadMethodCallException(sprintf('Method %s::%s does not exist', self::class, $name));
        }

        return $this->resp->$name(...$arguments);
    }

    /** Доступ к публичным свойствам HttpFoundation Response. */
    public function __get(string $name): mixed
    {
        if (property_exists($this->resp, $name)) {
            return $this->resp->$name;
        }

        trigger_error(sprintf('Undefined property: %s::$%s', self::class, $name), E_USER_NOTICE);

        return null;
    }

    public function __isset(string $name): bool
    {
        return property_exists($this->resp, $name) && isset($this->resp->$name);
    }
}
