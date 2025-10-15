<?php

declare(strict_types=1);

namespace Energine\Core\ExtraManager;

use Data;
use DataDescription;
use DOMDocument;

/**
 * Contract for optional editors (attachments, tags, etc.) that may extend Grid forms.
 */
interface ExtraManagerInterface
{
    /**
     * Determine whether manager can be applied to specified table/description.
     */
    public function supports(string $tableName, DataDescription $dataDescription): bool;

    /**
     * Enrich the form description with additional field(s) / tabs.
     */
    public function addFieldDescription(DataDescription $dataDescription): void;

    /**
     * Populate component data with manager-specific values (e.g. tab URLs, defaults).
     */
    public function addField(Data $data, string $tableName, ?string $recordId = null): void;

    /**
     * Allow manager to inject additional XML nodes during component build.
     */
    public function build(DOMDocument $document): void;
}
