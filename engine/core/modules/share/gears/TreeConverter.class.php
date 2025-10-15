<?php

declare(strict_types=1);

/**
 * TreeConverter
 *
 * Преобразует плоский список узлов в древовидную структуру TreeNodeList/TreeNode.
 *
 * Ожидаемый формат входа:
 *   [
 *     ['id' => '10', 'pid' => ''],         // корень (pid == '' или null)
 *     ['id' => '11', 'pid' => '10'],       // потомок 10
 *     ...
 *   ]
 *
 * Совместимость:
 *  - Возвращает TreeNodeList, как и раньше.
 *  - Использует методы parent->add(TreeNode) и node->addChild(TreeNode), как в старом коде.
 *  - Корнем считается parentKey == '' или null (строго как в старой реализации).
 *
 * Дополнительно:
 *  - Валидация структуры, сообщение об ошибке при дублях ключей и самоссылках.
 *  - Быстрая сборка по индексу parent → children (без O(n^2) сканирования).
 */
final class TreeConverter
{
    private function __construct()
    {
    }

    /**
     * @param array  $data            Входные данные (массив ассоц. массивов)
     * @param string $keyName         Имя поля с ID узла
     * @param string $parentKeyName   Имя поля с ID родителя
     * @return TreeNodeList
     *
     * @throws InvalidArgumentException при неправильном формате
     * @throws RuntimeException         если методы add()/addChild() возвращают неожиданные типы
     */
    public static function convert(array $data, string $keyName, string $parentKeyName): TreeNodeList
    {
        // Базовая валидация и индексация
        [$byParent, $allIds] = self::indexByParent($data, $keyName, $parentKeyName);

        // Создаём корневой список узлов
        $root = new TreeNodeList();

        // Корнями считаем группы с parent == '' (или null → ''), а также «висячих» детей,
        // чей parent отсутствует среди существующих id (на всякий случай).
        $rootParents = [''];
        foreach (array_keys($byParent) as $p)
        {
            if ($p !== '' && !isset($allIds[$p]))
            {
                $rootParents[] = $p;
            }
        }
        $rootParents = array_values(array_unique($rootParents));

        // Рекурсивно навешиваем потомков
        foreach ($rootParents as $p)
        {
            self::attachChildren($root, $p, $byParent, $keyName, $parentKeyName);
        }

        return $root;
    }

    /**
     * Строит индекс parentValue(string) => list(rows) и проверяет корректность данных.
     *
     * @return array{0: array<string, array<int, array>> , 1: array<string, true>}
     */
    private static function indexByParent(array $data, string $keyName, string $parentKeyName): array
    {
        $byParent = [];
        $idsSeen  = [];

        foreach ($data as $i => $row)
        {
            if (!is_array($row))
            {
                throw new InvalidArgumentException("Invalid row at index {$i}: not an array");
            }
            if (!array_key_exists($keyName, $row) || !array_key_exists($parentKeyName, $row))
            {
                throw new InvalidArgumentException(
                    "Invalid row at index {$i}: missing '{$keyName}' or '{$parentKeyName}'"
                );
            }

            // Нормализуем типы: сравнения делаем по строкам
            $id  = (string)$row[$keyName];
            $pid = (string)($row[$parentKeyName] ?? '');

            if ($id === $pid)
            {
                throw new InvalidArgumentException(
                    "Invalid row at index {$i}: node references itself (id == parentId == '{$id}')"
                );
            }
            if (isset($idsSeen[$id]))
            {
                throw new InvalidArgumentException(
                    "Duplicate node id '{$id}' at index {$i}. IDs must be unique."
                );
            }
            $idsSeen[$id] = true;

            $byParent[$pid][] = $row;
        }

        return [$byParent, $idsSeen];
    }

    /**
     * Рекурсивно добавляет дочерние узлы к $parentContainer.
     *
     * @param TreeNodeList|TreeNode $parentContainer
     * @param string                $parentId
     * @param array<string, array<int, array>> $byParent
     * @param string                $keyName
     * @param string                $parentKeyName
     */
    private static function attachChildren(
        object $parentContainer,
        string $parentId,
        array &$byParent,
        string $keyName,
        string $parentKeyName
    ): void {
        if (empty($byParent[$parentId]))
        {
            return;
        }

        foreach ($byParent[$parentId] as $row)
        {
            $id = (string)$row[$keyName];

            // Создаём узел
            $node = new TreeNode($id);

            // Добавляем к контейнеру:
            // - если верхний уровень → TreeNodeList::add(TreeNode)
            // - иначе → TreeNode::addChild(TreeNode)
            if ($parentContainer instanceof TreeNodeList)
            {
                $added = $parentContainer->add($node);
            }
            else
            {
                $added = $parentContainer->addChild($node);
            }

            // Ожидаем, что add()/addChild() возвращают добавленный TreeNode
            if (!$added instanceof TreeNode)
            {
                // На случай несоответствия старой реализации
                $added = $node;
            }

            // Рекурсивно добавляем потомков текущего узла
            self::attachChildren($added, $id, $byParent, $keyName, $parentKeyName);
        }
    }
}
