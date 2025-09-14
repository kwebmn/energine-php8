<?php
declare(strict_types=1);

final class LangSwitcher extends DataSet
{
    public function __construct($name, $module, array $params = null)
    {
        parent::__construct($name, $module, $params);
        $this->setType(self::COMPONENT_TYPE_LIST);
    }

    // Если у DataSet::createBuilder(): AbstractBuilder — оставь тип.
    // Если у родителя тип не задан, убери ": AbstractBuilder" здесь.
    protected function createBuilder(): AbstractBuilder
    {
        return new SimpleBuilder();
    }

    // Ключевая правка: вернуть совместимую сигнатуру с DataSet.
    protected function loadData(): array|false|null
    {
        $langService  = E()->getLanguage();
        $allLanguages = $langService->getLanguages();

        // Текущий путь страницы (без языкового префикса)
        $path = E()->getRequest()->getPath(Request::PATH_WHOLE, true);

        $result = [];

        foreach ($allLanguages as $langID => $langInfo) {
            $realAbbr = $langInfo['lang_abbr'];

            // Для языка по умолчанию префикс пустой
            if (!empty($langInfo['lang_default'])) {
                $langInfo['lang_abbr'] = '';
            }

            $prefix = (string)$langInfo['lang_abbr'];
            $url    = $prefix . ($prefix !== '' ? '/' : '') . $path;

            $result[$langID] = [
                'lang_id'        => (int)$langID,
                'lang_abbr'      => $langInfo['lang_abbr'],
                'lang_name'      => $langInfo['lang_name'],
                'lang_url'       => $url,
                'lang_real_abbr' => $realAbbr,
            ];
        }

        return $result;
    }

    protected function createDataDescription(): DataDescription
    {
        $dd = new DataDescription();

        $f = new FieldDescription('lang_id');
        $f->setType(FieldDescription::FIELD_TYPE_INT);
        $dd->addFieldDescription($f);

        $f = new FieldDescription('lang_abbr');
        $f->setType(FieldDescription::FIELD_TYPE_STRING);
        $dd->addFieldDescription($f);

        $f = new FieldDescription('lang_name');
        $f->setType(FieldDescription::FIELD_TYPE_STRING);
        $dd->addFieldDescription($f);

        $f = new FieldDescription('lang_url');
        $f->setType(FieldDescription::FIELD_TYPE_STRING);
        $dd->addFieldDescription($f);

        $f = new FieldDescription('lang_real_abbr');
        $f->setType(FieldDescription::FIELD_TYPE_STRING);
        $dd->addFieldDescription($f);

        return $dd;
    }
}
