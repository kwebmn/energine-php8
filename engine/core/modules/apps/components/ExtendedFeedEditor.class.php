<?php
declare(strict_types=1);

/**
 * Media feed editor.
 */
class ExtendedFeedEditor extends FeedEditor
{
    /**
     * Имя поля-идентификатора публикации.
     * @var string|null
     */
    private ?string $publishFieldName = null;

    /**
     * @copydoc FeedEditor::__construct
     */
    public function __construct($name, $module, array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setSaver(new ExtendedSaver());
    }

    /**
     * @copydoc FeedEditor::setParam
     */
    protected function setParam($name, $value) : void
    {
        if ($name === 'tableName') {
            foreach (array_keys($this->dbh->getColumnsInfo($value)) as $columnName) {
                // Ищем колонку, содержащую маркер '_is_published'
                if (is_string($columnName) && str_contains($columnName, '_is_published')) {
                    $this->publishFieldName = $columnName;
                    $this->addTranslation('BTN_PUBLISH', 'BTN_UNPUBLISH');
                    break;
                }
            }
        }

        parent::setParam($name, $value);
    }

    /**
     * @copydoc FeedEditor::add
     */
    protected function add() : void
    {
        parent::add();
        $tm = new TagManager($this->getDataDescription(), $this->getData(), $this->getTableName());
        $tm->createFieldDescription();
    }

    /**
     * @copydoc FeedEditor::edit
     */
    protected function edit() : void
    {
        parent::edit();
        $tm = new TagManager($this->getDataDescription(), $this->getData(), $this->getTableName());
        $tm->createFieldDescription();
        $tm->createField();
    }

    /**
     * @copydoc FeedEditor::autoCompleteTags
     *
     * @throws SystemException 'ERR_NO_DATA'
     */
    protected function autoCompleteTags() : void
    {
        $b = new JSONCustomBuilder();
        $this->setBuilder($b);

        try {
            if (!isset($_POST['value'])) {
                throw new SystemException('ERR_NO_DATA', SystemException::ERR_CRITICAL);
            }

            $query = (string) $_POST['value'];
            $tags  = TagManager::getTagStartedWith($query, 10);

            $result = ['result' => true, 'data' => []];

            if (is_array($tags) && !empty($tags)) {
                foreach ($tags as $tag) {
                    $result['data'][] = [
                        'key'   => $tag,
                        'value' => $tag,
                    ];
                }
            }
        } catch (Exception $e) {
            $result = [
                'result' => false,
                'data'   => false,
                'errors' => [],
            ];
        }

        $b->setProperties($result);
    }

    /**
     * Publish material (toggle).
     */
    protected function publish()
    {
        if ($this->publishFieldName === null) {
            throw new SystemException('ERR_NO_PUBLISH_FIELD', SystemException::ERR_DEVELOPER);
        }

        [$id] = $this->getStateParams();

        $this->dbh->modifyRequest(
            'UPDATE ' . $this->getTableName() .
            ' SET ' . $this->publishFieldName . ' = NOT ' . $this->publishFieldName .
            ' WHERE ' . $this->getPK() . ' = %s',
            $id
        );

        $b = new JSONCustomBuilder();
        $b->setProperties(['result' => true]);
        $this->setBuilder($b);
    }
}
