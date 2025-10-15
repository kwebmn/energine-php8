<?php

declare(strict_types=1);

/**
 * Feed — компонент ленты.
 *
 * Базируется на DBDataSet и фильтрует записи по smap_id,
 * поддерживает сортировку, лимиты и работу в разных состояниях.
 *
 * @author  dr.Pavka
 * @copyright Energine
 */
class Feed extends DBDataSet
{
    /**
     * Фильтр по ID разделов (один ID или список ID).
     */
    protected readonly int|array|null $filterID;

    /**
     * @copydoc DBDataSet::__construct
     */
    public function __construct(string $name, string $module, ?array $params = null)
    {
        parent::__construct($name, $module, $params);

        // Если title не указан — ставим дефолтный из переводов.
        if (!$this->getProperty('title'))
        {
            $this->setProperty(
                'title',
                $this->translate('TXT_' . strtoupper($this->getName()))
            );
        }

        $this->setProperty('exttype', 'feed');
        $this->setParam('onlyCurrentLang', true);

        if ($this->getParam('editable') && $this->document->isEditable())
        {
            $this->setProperty('editable', 'editable');
        }

        // Ограничения и настройки только для состояния 'main'.
        if ($this->getState() === 'main')
        {
            $filterID = $this->getParam('id') ?: $this->document->getID();

            if ($this->getParam('showAll'))
            {
                $par = E()->getMap()->getTree()->getNodeById($filterID);
                $descendants = [];
                if ($par)
                {
                    $descendants = array_keys($par->getDescendants()->asList(false));
                }
                $filterID = array_merge([$filterID], $descendants);
            }
            $this->filterID = $filterID;

            // Сортировка: orderField может быть строкой или [поле, направление].
            if ($orderParam = $this->getParam('orderField'))
            {
                if (is_array($orderParam))
                {
                    $field = $orderParam[0] ?? null;
                    $dir   = strtoupper((string)($orderParam[1] ?? QAL::ASC));
                }
                else
                {
                    $field = $orderParam;
                    $dir   = QAL::ASC;
                }

                if ($field)
                {
                    if (!in_array($dir, [QAL::ASC, QAL::DESC], true))
                    {
                        $dir = QAL::ASC;
                    }
                    $this->setOrder([$field => $dir]);
                }
            }

            // Фильтр по smap_id.
            $this->addFilterCondition(['smap_id' => $this->filterID]);

            // Лимит записей.
            if ($limit = $this->getParam('limit'))
            {
                $this->setLimit([0, (int)$limit]);
                $this->setParam('recordsPerPage', false);
            }
        }
        else
        {
            $this->filterID = null;
        }
    }

    /**
     * @copydoc DBDataSet::loadDataDescription
     *
     * Якщо у конфігі є smap_id, то прибираємо ознаку ключа,
     * щоб не тягнути share_sitemap — тут нам потрібен лише int.
     */
    protected function loadDataDescription(): array|false|null
    {
        $result = parent::loadDataDescription();
        if (isset($result['smap_id']))
        {
            $result['smap_id']['key'] = false;
        }
        return $result;
    }

    /**
     * @copydoc DBDataSet::createDataDescription
     *
     * Якщо smap_id немає в описі — додаємо його з поточною таблицею
     * і ховаємо як FIELD_TYPE_HIDDEN у стані main.
     */
    protected function createDataDescription(): DataDescription
    {
        $result = parent::createDataDescription();

        if ($this->getState() === 'main')
        {
            if (!($fd = $result->getFieldDescriptionByName('smap_id')))
            {
                $fd = new FieldDescription('smap_id');
                $fd->setProperty('tableName', $this->getTableName());
                $result->addFieldDescription($fd);
            }
            $fd->setType(FieldDescription::FIELD_TYPE_HIDDEN);
        }

        return $result;
    }

    /**
     * @copydoc DBDataSet::main
     *
     * Проставляем каждому smap_id вычисленный URL (row property 'url'),
     * чтобы корректно собирать ссылки при разных smap_id на одной странице.
     */
    protected function main(): void
    {
        parent::main();

        if ($f = $this->getData()->getFieldByName('smap_id'))
        {
            foreach ($f as $key => $value)
            {
                $f->setRowProperty($key, 'url', E()->getMap()->getURLByID((int)$value));
            }
        }
    }

    /**
     * @copydoc DBDataSet::view
     *
     * Добавляем фильтр по текущему разделу и крошку.
     */
    protected function view(): void
    {
        parent::view();
        $this->addFilterCondition(['smap_id' => $this->document->getID()]);
        $this->document->componentManager->getBlockByName('breadCrumbs')->addCrumb();
    }

    /**
     * @copydoc DBDataSet::defineParams
     *
     * Делаем компонент активным и задаём дефолтные параметры.
     */
    protected function defineParams(): array
    {
        return array_merge(
            parent::defineParams(),
            [
                'active'     => true,
                'showAll'    => false,
                'id'         => false,
                'limit'      => false,
                'editable'   => false,
                'orderField' => false,
            ]
        );
    }
}
