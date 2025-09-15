<?php
namespace App\Routing;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Класс Router.
 * Пример маршрутизатора для служебных маршрутов.
 * Использование: вызывается из точки входа приложения.
 */
final class Router {
    /**
     * Возвращает простой ответ для проверки работоспособности сервиса.
     *
     * @param Request $r Входящий запрос
     * @return Response
     */
    public function health(Request $r): Response {
        return new Response('ok', 200);
    }
}
