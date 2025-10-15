<?php

declare(strict_types=1);

/**
 * List of pages for navigation.
 *
 * Улучшения:
 * - Корректная нормализация текущей страницы в границы [1..numPages].
 * - Свойства from_value/to_value + page/pages/per_page для XSLT.
 * - Кнопки «в начало/назад/вперёд/в конец».
 * - Построение только нужного окна страниц (без итерации по всем страницам).
 * - Небольшие защитные проверки, дружелюбное поведение при пустых данных.
 */
final class Pager extends BaseObject
{
    /** Сколько страниц показывать слева и справа от текущей */
    public const VISIBLE_PAGES_AROUND_DEFAULT = 2;

    /** @var int Кол-во записей на страницу */
    private int $recordsPerPage;

    /** @var int Итоговое кол-во страниц */
    private int $numPages = 0;

    /** @var int Итоговое кол-во записей */
    private int $recordsCount = 0;

    /** @var int Текущая страница (1+) */
    private int $currentPage = 1;

    /** @var array Свойства тулбара */
    private array $properties = [];

    /** @var int Сколько страниц рисовать вокруг текущей */
    private int $visibleAround = self::VISIBLE_PAGES_AROUND_DEFAULT;

    /** @var bool Показывать first/last */
    private bool $showFirstLast = true;

    /** @var bool Показывать prev/next */
    private bool $showPrevNext = true;

    /**
     * @param int $recordsPerPage
     * @param int $currentPage
     *
     * @throws SystemException
     */
    public function __construct(int $recordsPerPage = 10, int $currentPage = 1)
    {
        $this->setRecordsPerPage($recordsPerPage);
        $this->setCurrentPage($currentPage);
    }

    /**
     * Установить «окно» видимых страниц вокруг текущей.
     */
    public function setVisibleAround(int $count): self
    {
        $this->visibleAround = max(0, $count);
        return $this;
    }

    public function showFirstLast(bool $show): self
    {
        $this->showFirstLast = $show;
        return $this;
    }

    public function showPrevNext(bool $show): self
    {
        $this->showPrevNext = $show;
        return $this;
    }

    /**
     * @throws SystemException
     */
    public function setRecordsPerPage(int $recordsPerPage): void
    {
        if ($recordsPerPage < 1)
        {
            throw new SystemException('ERR_DEV_BAD_RECORDS_PER_PAGE', SystemException::ERR_DEVELOPER);
        }
        $this->recordsPerPage = $recordsPerPage;
        // Пересчёт страниц возможен только если уже знаем общее число записей
        if ($this->recordsCount >= 0)
        {
            $this->recalcPagesAndClamp();
        }
    }

    public function getRecordsPerPage(): int
    {
        return $this->recordsPerPage;
    }

    public function getNumPages(): int
    {
        return $this->numPages;
    }

    /**
     * @throws SystemException
     */
    public function setCurrentPage(int $currentPage): void
    {
        if ($currentPage < 1)
        {
            throw new SystemException('ERR_DEV_BAD_PAGE_NUMBER', SystemException::ERR_DEVELOPER);
        }
        $this->currentPage = $currentPage;
        // Если кол-во страниц уже известно — поджать сразу
        if ($this->numPages > 0)
        {
            $this->currentPage = min($this->currentPage, $this->numPages);
        }
    }

    /**
     * @throws SystemException
     */
    public function setRecordsCount(int $count): void
    {
        if ($count < 0)
        {
            throw new SystemException('ERR_DEV_BAD_RECORDS_COUNT', SystemException::ERR_DEVELOPER);
        }
        $this->recordsCount = $count;
        $this->recalcPagesAndClamp();
    }

    public function getRecordsCount(): int
    {
        return $this->recordsCount;
    }

    public function getCurrentPage(): int
    {
        return $this->currentPage;
    }

    public function setProperty(string $name, mixed $value): void
    {
        $this->properties[$name] = $value;
    }

    /**
     * LIMIT для QAL::select()
     */
    public function getLimit(): array
    {
        $offset = ($this->getCurrentPage() - 1) * $this->getRecordsPerPage();
        return [$offset, $this->getRecordsPerPage()];
    }

    /**
     * Построить DOM-узел пагинации.
     *
     * @return DOMNode|false
     */
    public function build()
    {
        $pager = new Toolbar('pager');

        // Пробросим текущую строку GET — чтобы UI мог собирать ссылки
        if (!empty($_GET))
        {
            $this->setProperty('get_string', http_build_query($_GET));
        }

        // Стандартные подписи и счётчики
        $pager->setProperty('from', DBWorker::_translate('TXT_FROM'));
        $pager->setProperty('to', DBWorker::_translate('TXT_TO'));
        $pager->setProperty('records', $this->recordsCount);

        // Доп. свойства — удобно в XSLT
        [$from, $to] = $this->calcFromTo();
        $pager->setProperty('from_value', $from);
        $pager->setProperty('to_value', $to);
        $pager->setProperty('page', $this->currentPage);
        $pager->setProperty('pages', $this->numPages);
        $pager->setProperty('per_page', $this->recordsPerPage);

        // Пользовательские свойства (если выставляли заранее)
        if (!empty($this->properties))
        {
            foreach ($this->properties as $k => $v)
            {
                $pager->setProperty($k, $v);
            }
        }

        $total   = $this->numPages;
        $current = $this->currentPage;

        // Если страниц 0 или 1 — ничего не рисуем (BC: Toolbar::build() вернёт false без controls)
        if ($total <= 1)
        {
            return $pager->build();
        }

        // Кнопки «в начало/назад»
        if ($this->showFirstLast)
        {
            $first = new Link('page_first', '1', '«');
            if ($current === 1)
            {
                $first->disable();
            }
            $pager->attachControl($first);
        }
        if ($this->showPrevNext)
        {
            $prevPage = max(1, $current - 1);
            $prev = new Link('page_prev', (string)$prevPage, '‹');
            if ($current === 1)
            {
                $prev->disable();
            }
            $pager->attachControl($prev);
        }

        // Основное «окно» страниц
        foreach ($this->buildPageSequence($total, $current, $this->visibleAround) as $token)
        {
            if ($token === '…')
            {
                $pager->attachControl(new Separator('sep_' . uniqid()));
                continue;
            }
            $page = (int)$token;
            $control = new Link('page' . $page, (string)$page, (string)$page);
            if ($page === $current)
            {
                $control->disable();
            }
            $pager->attachControl($control);
        }

        // Кнопки «вперёд/в конец»
        if ($this->showPrevNext)
        {
            $nextPage = min($total, $current + 1);
            $next = new Link('page_next', (string)$nextPage, '›');
            if ($current === $total)
            {
                $next->disable();
            }
            $pager->attachControl($next);
        }
        if ($this->showFirstLast)
        {
            $last = new Link('page_last', (string)$total, '»');
            if ($current === $total)
            {
                $last->disable();
            }
            $pager->attachControl($last);
        }

        return $pager->build();
    }

    /**
     * Пересчитать число страниц и поджать текущую.
     */
    private function recalcPagesAndClamp(): void
    {
        $this->numPages = ($this->recordsPerPage > 0)
            ? (int)ceil($this->recordsCount / $this->recordsPerPage)
            : 0;

        if ($this->numPages > 0)
        {
            $this->currentPage = min(max(1, $this->currentPage), $this->numPages);
        }
        else
        {
            // При нуле страниц оставим currentPage = 1 (не влияет на build)
            $this->currentPage = 1;
        }
    }

    /**
     * Вычислить границы «с какой по какую запись».
     */
    private function calcFromTo(): array
    {
        if ($this->recordsCount === 0)
        {
            return [0, 0];
        }
        $from = ($this->currentPage - 1) * $this->recordsPerPage + 1;
        $to   = min($this->recordsCount, $this->currentPage * $this->recordsPerPage);
        return [$from, $to];
    }

    /**
     * Построить компактную последовательность страниц с «…».
     *
     * Пример: total=456, current=8, visible=2 =>
     * [1,2,'…',6,7,8,9,10,'…',455,456]
     *
     * @return array<int|string>
     */
    private function buildPageSequence(int $total, int $current, int $visible): array
    {
        $ranges = [];

        // Голова
        $headEnd = min($total, 1 + $visible);
        $ranges[] = [1, $headEnd];

        // Окно вокруг текущей
        $winStart = max(1, $current - $visible);
        $winEnd   = min($total, $current + $visible);
        $ranges[] = [$winStart, $winEnd];

        // Хвост
        $tailStart = max(1, $total - $visible);
        $ranges[] = [$tailStart, $total];

        // Слить диапазоны, отсортировать, добавить «…» при разрывах
        usort($ranges, static function ($a, $b)
        {
            return $a[0] <=> $b[0];
        });

        // Нормализация (слияние пересечений)
        $merged = [];
        foreach ($ranges as [$s, $e])
        {
            if (empty($merged) || $s > $merged[count($merged) - 1][1] + 1)
            {
                $merged[] = [$s, $e];
            }
            else
            {
                $merged[count($merged) - 1][1] = max($merged[count($merged) - 1][1], $e);
            }
        }

        // Финальная плоская последовательность
        $seq = [];
        $prevEnd = 0;
        foreach ($merged as [$s, $e])
        {
            if ($prevEnd > 0 && $s > $prevEnd + 1)
            {
                $seq[] = '…';
            }
            for ($i = $s; $i <= $e; $i++)
            {
                $seq[] = $i;
            }
            $prevEnd = $e;
        }

        return $seq;
    }
}
